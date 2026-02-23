%% midi-logger.ily — Scheme engraver that logs MIDI tag properties
%% ================================================================
%%
%% Include this file in any .ly file that uses midi-tags.ily to get
%% a JSON event log written alongside the MIDI output.
%%
%% Usage:
%%   \include "midi-tags.ily"
%%   \include "midi-logger.ily"
%%
%%   Then in \layout { \context { \Voice \consists \midiLogEngraver } }
%%
%% Output: <basename>-midi-log.json in the same directory as the .ly file
%%
%% The event log is a JSON array of objects, one per note group:
%%   [
%%     {"moment": "0/1", "notes": ["fs'"], "midiCCZero": 95, "midiVelocity": null, "midiGliss": null},
%%     ...
%%   ]
%%
%% This log is consumed by the Node.js state tracker script to produce
%% the CC map JSON file for modify_midi.js.
%%
%% Source of truth: docs/cc_mapping_registry.json
%% ================================================================

#(define midi-log-port #f)
#(define midi-log-first-entry #t)
#(define midi-log-current-notes '())
#(define midi-log-tie-heard #f)
#(define midi-log-skip-next #f)
#(define midi-log-written-this-step #f)
#(define midi-log-engraver-count 0)

%% Helper: convert a LilyPond pitch to a readable string in LilyPond English notation.
%% Uses \language "english" suffixes: s=sharp, f=flat, ss=double sharp, ff=double flat,
%% qs=quarter sharp, qf=quarter flat, tqs=three-quarter sharp, tqf=three-quarter flat.
%%
%% ly:pitch-alteration returns HALF-SEMITONE units (exact rationals):
%%   1/2 = sharp, -1/2 = flat, 1 = double sharp, -1 = double flat,
%%   1/4 = quarter sharp, -1/4 = quarter flat, 3/4 = three-quarter sharp, -3/4 = three-quarter flat
%%
%% ly:pitch-octave returns octave relative to middle-C octave:
%%   -1 = c (C3, no marks), 0 = c' (C4, middle C), 1 = c'' (C5), -2 = c, (C2)
%%
#(define (pitch->lily-string pitch)
   (let* ((notename (ly:pitch-notename pitch))
          (alteration (ly:pitch-alteration pitch))
          (octave (ly:pitch-octave pitch))
          ;; LilyPond note names: 0=c, 1=d, 2=e, 3=f, 4=g, 5=a, 6=b
          (name-str (list-ref '("c" "d" "e" "f" "g" "a" "b") notename))
          ;; Alteration → LilyPond English suffix
          (alt-str (cond
                    ((= alteration 1) "ss")       ; double sharp
                    ((= alteration 1/2) "s")      ; sharp
                    ((= alteration 1/4) "qs")     ; quarter sharp
                    ((= alteration -1/4) "qf")    ; quarter flat
                    ((= alteration -1/2) "f")     ; flat
                    ((= alteration -1) "ff")      ; double flat
                    ((= alteration 3/4) "tqs")    ; three-quarter sharp
                    ((= alteration -3/4) "tqf")   ; three-quarter flat
                    (else "")))
          ;; Octave → LilyPond marks (apostrophes up, commas down)
          ;; octave -1 = no marks, 0 = one ', 1 = two '', etc.
          (oct-str (cond
                    ((>= octave 0) (make-string (+ octave 1) #\'))
                    ((= octave -1) "")
                    (else (make-string (- (- octave) 1) #\,)))))
     (string-append name-str alt-str oct-str)))

%% Helper: format a moment as a fraction string "num/den"
#(define (moment->fraction-string mom)
   (let ((main-num (ly:moment-main-numerator mom))
         (main-den (ly:moment-main-denominator mom)))
     (format #f "~a/~a" main-num main-den)))

%% The engraver definition
#(define midiLogEngraver
   (make-engraver

    ;; Initialize: open the output file (only once — guards against
    ;; multiple Voice contexts in polyphonic << ... \new Voice ... >> blocks)
    ((initialize engraver)
     (set! midi-log-engraver-count (+ midi-log-engraver-count 1))
     (if (not midi-log-port)
         (let* ((outname (ly:parser-output-name))
                (logfile (string-append outname "-midi-log.json")))
           (set! midi-log-port (open-output-file logfile))
           (set! midi-log-first-entry #t)
           (display "[\n" midi-log-port))))

    ;; Listen for note events and tie events
    (listeners
     ((note-event engraver event)
      (let ((pitch (ly:event-property event 'pitch)))
        (if (ly:pitch? pitch)
            (set! midi-log-current-notes
                  (append midi-log-current-notes
                          (list (pitch->lily-string pitch)))))))
     ((tie-event engraver event)
      (set! midi-log-tie-heard #t)))

    ;; Process music: after all listeners have fired for this timestep,
    ;; emit an entry if we collected any notes
    ((process-music engraver)
     (if (and midi-log-port (not (null? midi-log-current-notes))
              (not midi-log-skip-next) (not midi-log-written-this-step))
         (let* ((ctx (ly:translator-context engraver))
                (mom (ly:context-current-moment ctx))
                (mom-str (moment->fraction-string mom))
                (cc0-raw (ly:context-property ctx 'midiCCZero))
                (vel-raw (ly:context-property ctx 'midiVelocity))
                (gliss-raw (ly:context-property ctx 'midiGliss))
                (cc0 (if (null? cc0-raw) "null" (number->string cc0-raw)))
                (vel (if (null? vel-raw) "null" (number->string vel-raw)))
                (gliss (if (null? gliss-raw) "null" (number->string gliss-raw)))
                ;; Format notes as JSON array of strings
                (notes-json (string-append "["
                             (string-join
                              (map (lambda (n) (format #f "\"~a\"" n))
                                   midi-log-current-notes)
                              ", ")
                             "]"))
                ;; Build the JSON object
                (entry (format #f "  {\"moment\": \"~a\", \"notes\": ~a, \"midiCCZero\": ~a, \"midiVelocity\": ~a, \"midiGliss\": ~a}"
                               mom-str notes-json cc0 vel gliss)))
           ;; Comma before all entries except the first
           (if midi-log-first-entry
               (set! midi-log-first-entry #f)
               (display ",\n" midi-log-port))
           (display entry midi-log-port)
           (set! midi-log-written-this-step #t)))
     ;; If we were told to skip (tie continuation), just clear the flag
     (if midi-log-skip-next
         (set! midi-log-skip-next #f))
     ;; If a tie was heard this timestep, skip the NEXT timestep
     (if midi-log-tie-heard
         (begin
           (set! midi-log-skip-next #t)
           (set! midi-log-tie-heard #f))))

    ;; Stop translation timestep: reset note collector
    ((stop-translation-timestep engraver)
     (set! midi-log-current-notes '())
     (set! midi-log-written-this-step #f))

    ;; Finalize: close the JSON array and file
    ((finalize engraver)
     (set! midi-log-engraver-count (- midi-log-engraver-count 1))
     (if (and midi-log-port (<= midi-log-engraver-count 0))
         (begin
           (display "\n]\n" midi-log-port)
           (close-port midi-log-port)
           (set! midi-log-port #f))))))

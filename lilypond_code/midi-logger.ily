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
%%     {"moment": "0/1", "notes": ["fs'"], "midiCCZero": 95, "midiVelocity": null},
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

%% Helper: convert a LilyPond pitch to a readable string like "fs'" or "af,"
#(define (pitch->lily-string pitch)
   (let* ((notename (ly:pitch-notename pitch))
          (alteration (ly:pitch-alteration pitch))
          (octave (ly:pitch-octave pitch))
          ;; LilyPond note names: 0=c, 1=d, 2=e, 3=f, 4=g, 5=a, 6=b
          (name-str (list-ref '("c" "d" "e" "f" "g" "a" "b") notename))
          ;; Alteration: -1=flat, -1/2=half-flat, 0=natural, 1/2=half-sharp, 1=sharp
          (alt-str (cond
                    ((= alteration 1) "is")
                    ((= alteration -1) "es")
                    ((= alteration 1/2) "ih")
                    ((= alteration -1/2) "eh")
                    (else "")))
          ;; Octave marks: octave 0 = middle octave (c'), negative = commas, positive = apostrophes
          ;; LilyPond internal: octave -1 = c (no marks), 0 = c', 1 = c'', -2 = c,
          (oct-str (cond
                    ((> octave 0) (make-string (+ octave 0) #\'))
                    ((< octave 0) (make-string (- 0 octave) #\,))
                    (else "'"))))
     (string-append name-str alt-str oct-str)))

%% Helper: format a moment as a fraction string "num/den"
#(define (moment->fraction-string mom)
   (let ((main-num (ly:moment-main-numerator mom))
         (main-den (ly:moment-main-denominator mom)))
     (format #f "~a/~a" main-num main-den)))

%% The engraver definition
#(define midiLogEngraver
   (lambda (context)
     (make-engraver

      ;; Initialize: open the output file
      ((initialize translator)
       (let* ((outname (ly:parser-output-name))
              (logfile (string-append outname "-midi-log.json")))
         (set! midi-log-port (open-output-file logfile))
         (set! midi-log-first-entry #t)
         (display "[\n" midi-log-port)))

      ;; Listen for note events — collect pitches at this timestep
      (listeners
       ((note-event engraver event)
        (let ((pitch (ly:event-property event 'pitch)))
          (if (ly:pitch? pitch)
              (set! midi-log-current-notes
                    (append midi-log-current-notes
                            (list (pitch->lily-string pitch))))))))

      ;; Process music: after all listeners have fired for this timestep,
      ;; emit an entry if we collected any notes
      ((process-music translator)
       (if (and midi-log-port (not (null? midi-log-current-notes)))
           (let* ((mom (ly:context-current-moment context))
                  (mom-str (moment->fraction-string mom))
                  (cc0-raw (ly:context-property context 'midiCCZero '()))
                  (vel-raw (ly:context-property context 'midiVelocity '()))
                  (cc0 (if (null? cc0-raw) "null" (number->string cc0-raw)))
                  (vel (if (null? vel-raw) "null" (number->string vel-raw)))
                  ;; Format notes as JSON array of strings
                  (notes-json (string-append "["
                               (string-join
                                (map (lambda (n) (format #f "\"~a\"" n))
                                     midi-log-current-notes)
                                ", ")
                               "]"))
                  ;; Build the JSON object
                  (entry (format #f "  {\"moment\": \"~a\", \"notes\": ~a, \"midiCCZero\": ~a, \"midiVelocity\": ~a}"
                                 mom-str notes-json cc0 vel)))
             ;; Comma before all entries except the first
             (if midi-log-first-entry
                 (set! midi-log-first-entry #f)
                 (display ",\n" midi-log-port))
             (display entry midi-log-port))))

      ;; Stop translation timestep: reset note collector
      ((stop-translation-timestep translator)
       (set! midi-log-current-notes '()))

      ;; Finalize: close the JSON array and file
      ((finalize translator)
       (if midi-log-port
           (begin
             (display "\n]\n" midi-log-port)
             (close-port midi-log-port)
             (set! midi-log-port #f)))))))

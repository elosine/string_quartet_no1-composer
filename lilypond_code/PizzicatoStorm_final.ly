\version "2.24.4"
\language "english"

% PIZZICATO STORM - Two-Handed Action Notation
% Based on Hübler/Cassidy prescriptive notation style
% Three staves: L.H. Pluck (top), L.H. Fingering (middle), R.H. Pluck (bottom)
% Middle staff features: down-arrow → wavy gliss → grace note cell → wavy gliss → up-arrow

\paper {
  tagline = ##f
  paper-width = 50\mm
  paper-height = 100\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}

% ============================================
% ADJUSTABLE PARAMETERS
% ============================================
% Instrument name font size (adjust this value)
#(define instrument-name-font-size -6)

% Staff line width in mm (adjust this value for each staff)
#(define lh-pluck-staff-width 2.9)
#(define lh-fingering-staff-width 2.9)
#(define rh-pluck-staff-width 2.9)

% Stem length for standalone 8th notes with tremolo (in staff spaces)
#(define pluck-stem-length 12)

% Stem extension upward (negative value extends stem toward top notehead)
% Adjust this to make stem touch the top notehead
#(define pluck-stem-shorten -2)

% Instrument name padding (X distance from staff, in staff spaces)
% Decrease this value to move names closer to staff
#(define instrument-name-padding -2.5)

% Arrow notehead Y offset (positive = up, negative = down)
% Adjust to move arrow noteheads along the stem
#(define arrow-notehead-y-offset 0.5)

% Custom staff line stencil function
#(define (make-custom-staff-stencil width-mm)
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width-staff-spaces (/ (* width-mm 2.8346) staff-space))
            (half-height (* (/ (- line-count 1) 2) staff-space)))
       (apply ly:stencil-add
              (map
               (lambda (i)
                 (ly:make-stencil
                  (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                  (cons 0 width-staff-spaces)
                  (cons (- half-height) half-height)))
               (iota line-count (- (/ (- line-count 1) 2))))))))

% Custom arrow noteheads using markup
#(define (arrow-down-notehead grob)
   (grob-interpret-markup grob
                          (markup #:translate (cons 0 (- arrow-notehead-y-offset))
                                  #:fontsize 2 #:arrow-head Y DOWN #t)))

#(define (arrow-up-notehead grob)
   (grob-interpret-markup grob
                          (markup #:translate (cons 0 arrow-notehead-y-offset)
                                  #:fontsize 2 #:arrow-head Y UP #t)))


\book {
  \header {
    tagline = ##f
  }

  \score {
    <<
      \override Score.BarNumber.break-visibility = ##(#f #f #f)

      % === L.H. PLUCK STAFF (Top - single line) ===
      \new Staff \with {
        instrumentName = \markup {
          \override #`(font-name . "Crimson Pro Light Italic")
          \fontsize #instrument-name-font-size
          "L.H. Pluck"
        }
        \omit TimeSignature
        \omit BarLine
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.line-count = #1
        \override StaffSymbol.stencil = #(make-custom-staff-stencil lh-pluck-staff-width)
      }
      {
        \time 3/4
        \override NoteHead.font-size = #-2
        \override TextScript.font-size = #-3
        % Stem.length controls standalone note stems (not beamed)
        \override Stem.length = #pluck-stem-length
        % Negative stem-shorten extends stem upward toward top notehead
        \override Stem.details.stem-shorten = #`(,pluck-stem-shorten)

        % Chord with tremolo slashes (8th note) - :64 = 3 slashes
        <
        \tweak NoteHead.extra-offset #'(0 . -1) b'
        b'
        \tweak NoteHead.extra-offset #'(0 . 1) b'
        >8:64
      }

      % === L.H. FINGERING STAFF (Middle - 5 lines, main content) ===
      \new Staff \with {
        instrumentName = \markup {
          \override #`(font-name . "Crimson Pro Light Italic")
          \fontsize #instrument-name-font-size
          "L.H. Fingering"
        }
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.stencil = #(make-custom-staff-stencil lh-fingering-staff-width)
        \omit LedgerLineSpanner
      }
      {
        \time 4/4
        \override NoteHead.font-size = #-2
        \override Stem.details.beamed-lengths = #'(7.5)
        \override Stem.details.lengths = #'(7.5)
        \override TextScript.font-size = #-3
        \override Glissando.style = #'trill
        \override Glissando.bound-details.left.padding = #1.2
        \override Glissando.bound-details.right.padding = #1
        \override Accidental.stencil = ##f

        % DOWN ARROW NOTEHEAD on F3
        \once \override NoteHead.stencil = #arrow-down-notehead
        \tweak NoteHead.extra-offset #'(0.45 . 0.3)
        f4
        \glissando

        % UP ARROW NOTEHEAD on E6
        \once \override NoteHead.stencil = #arrow-up-notehead
        \tweak NoteHead.extra-offset #'(-0.4 . 0.3)

        e'''4
        \glissando

        % DOWN ARROW NOTEHEAD on C4
        \once \override NoteHead.stencil = #arrow-down-notehead
        \tweak NoteHead.extra-offset #'(0.45 . 0.3)
        f4
      }

      % === R.H. PLUCK STAFF (Bottom - single line) ===
      \new Staff \with {
        instrumentName = \markup {
          \override #`(font-name . "Crimson Pro Light Italic")
          \fontsize #instrument-name-font-size
          "R.H. Pluck"
        }
        \omit TimeSignature
        \omit BarLine
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.line-count = #1
        \override StaffSymbol.stencil = #(make-custom-staff-stencil rh-pluck-staff-width)
      }
      {
        \time 3/4
        \override NoteHead.font-size = #-2
        \override TextScript.font-size = #-3
        % Stem.length controls standalone note stems (not beamed)
        \override Stem.length = #pluck-stem-length
        % Negative stem-shorten extends stem upward toward top notehead
        \override Stem.details.stem-shorten = #`(,pluck-stem-shorten)

        % Chord with tremolo slashes (8th note) - :64 = 3 slashes
        <
        \tweak NoteHead.extra-offset #'(0 . -1.1) b'
        b'
        \tweak NoteHead.extra-offset #'(0 . 1) b'
        >8:64
      }

    >>

    \layout {
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/24)
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
      }
      \context {
        \Staff
        % Adjust padding between instrument name and staff
        \override InstrumentName.padding = #instrument-name-padding
      }
      % indent controls the total space reserved for instrument names
      indent = 18\mm
      line-width = 40\mm
      #(layout-set-staff-size 18)
    }

    \midi {}
  }
}

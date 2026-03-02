\version "2.24.4"
\language "english"

% PIZZICATO STORM - Two-Handed Action Notation
% Based on Hübler/Cassidy prescriptive notation style
% Three staves: L.H. Pluck (top), L.H. Fingering (middle), R.H. Pluck (bottom)
% Middle staff features: down-arrow → wavy gliss → grace note cell → wavy gliss → up-arrow

\paper {
  tagline = ##f
  paper-width = 60\mm
  paper-height = 100\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
  ragged-bottom = ##t
}

% ============================================
% ADJUSTABLE PARAMETERS
% ============================================
% Instrument name font size (adjust this value)
#(define instrument-name-font-size -6)

% Staff line width in mm (adjust this value for each staff)
#(define lh-pluck-staff-width 2.6)
#(define lh-fingering-staff-width 2.9)
#(define rh-pluck-staff-width 2.3)

% Vertical distance between staves (in staff spaces, independent per pair)
% Staff 1 (L.H. Pluck) → Staff 2 (L.H. Fingering)
#(define staff-1-to-2-distance 7.5)
% Staff 2 (L.H. Fingering) → Staff 3 (R.H.)
#(define staff-2-to-3-distance 10)

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

% Arrow stem length for middle staff (in staff spaces)
% Controls how far the arrow noteheads extend above/below the staff
#(define arrow-stem-length 6)

% Arrow head size (fontsize units — larger = bigger arrowhead)
#(define arrow-head-fontsize 2)

% R.H. staff text label font sizes (f.b. and b.b.)
#(define fb-text-fontsize -2.5)
#(define bb-text-fontsize -8)

% R.H. grace group horizontal position (negative = left, positive = right)
#(define rh-grace-x-offset -5.7)

% Grace note figure magnification (scales noteheads, stems, beams)
% 0.63 = standard grace size (2/3), 0.5 = half size, 1.0 = full size
#(define grace-note-magnification 0.63)

% Grace note horizontal spacing (default 0.8, smaller = tighter)
#(define grace-spacing-increment 0)

% Independent size control for X noteheads (change without affecting regular noteheads)
#(define x-notehead-size -4.5)

% Dynamic marking (piano) controls — independent per staff
% L.H. Pluck staff piano (top staff, grace notes)
#(define lh-pluck-piano-fontsize -4)
#(define lh-pluck-piano-x-offset -1)
#(define lh-pluck-piano-y-offset -0.7)
% L.H. Fingering staff piano (middle staff, down-arrow note)
#(define lh-fingering-piano-fontsize -4)
#(define lh-fingering-piano-x-offset 0.6)
#(define lh-fingering-piano-y-offset 0)

xHeadOnce = {
  \once \override NoteHead.style = #'cross
  \once \override NoteHead.font-size = #x-notehead-size
}
xHead = {
  \override NoteHead.style = #'cross
  \override NoteHead.font-size = #x-notehead-size
}
xHeadRevert = {
  \revert NoteHead.style
  \revert NoteHead.font-size
}

% Custom staff line stencil function
#(define (make-custom-staff-stencil width-mm)
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width-staff-spaces (/ (* width-mm 3) staff-space))
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
                                  #:fontsize arrow-head-fontsize #:arrow-head Y DOWN #t)))

#(define (arrow-up-notehead grob)
   (grob-interpret-markup grob
                          (markup #:translate (cons 0 arrow-notehead-y-offset)
                                  #:fontsize arrow-head-fontsize #:arrow-head Y UP #t)))


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
          "L.H.-2,3,4"
        }
        \omit TimeSignature
        \omit BarLine
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.line-count = #3
        \override StaffSymbol.staff-space = #1.4
        \override StaffSymbol.stencil = #(make-custom-staff-stencil lh-pluck-staff-width)
        \override VerticalAxisGroup.default-staff-staff-spacing.basic-distance = #staff-1-to-2-distance
        \override VerticalAxisGroup.default-staff-staff-spacing.minimum-distance = #0
        \override VerticalAxisGroup.default-staff-staff-spacing.padding = #0
        \override VerticalAxisGroup.default-staff-staff-spacing.stretchability = #0
      }
      {
        \time 3/4
        \override Stem.details.beamed-lengths = #'(4)
        \override Stem.direction = #up

        % Grace note figure: lines 1,3,2,3,1 (bottom to top) — X noteheads, 16th beamed
        % BOX AROUND GRACE NOTE FIGURE: path rectangle
        % Adjust translate for position, path coordinates for size
        % increase height from bottom: decrease B (moveto Y) and D (lineto Y)
        % increase height from top: increase F (lineto Y) and H (lineto Y)
        % increase width from right: increase C (lineto X) and E (lineto X)
        % increase width from left: decrease A (moveto X) and G (lineto X)
        \xHead
        \grace {
          \magnifyMusic #grace-note-magnification {
          % NoteColumn.X-offset: negative = left, positive = right (shifts entire grace group)
          \override NoteColumn.X-offset = #-4.8
          g'16[
          -\tweak outside-staff-priority ##f
          -\tweak extra-offset #'(0 . 0)
          ^\markup {
            \with-dimensions #'(0 . 0) #'(0 . 0)
            \translate #'(-0.5 . -1.5)
            \override #'(thickness . 0.8)
            \path #0.15
            #'((moveto  0 -2.6) ;A B
                              (lineto  5 -2.6) ;C D
                              (lineto  5 3.5) ;E F
                              (lineto  0 3.5) ;G H
                              (closepath))
          }
          d''
          -\tweak outside-staff-priority ##f
          -\tweak font-size #lh-pluck-piano-fontsize
          -\tweak extra-offset #(cons lh-pluck-piano-x-offset lh-pluck-piano-y-offset)
          _\p b' d'' g']
          \revert NoteColumn.X-offset
          }
        }
        \xHeadRevert
        s4
      }

      % === L.H. FINGERING STAFF (Middle - 5 lines, main content) ===
      \new Staff \with {
        instrumentName = \markup {
          \override #`(font-name . "Crimson Pro Light Italic")
          \fontsize #instrument-name-font-size
          "L.H.-1"
        }
        % Move label closer to staff (positive X = right, Y = up)
        \override InstrumentName.extra-offset = #'(1.7 . 0)
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.stencil = #(make-custom-staff-stencil lh-fingering-staff-width)
        \omit LedgerLineSpanner
        \override VerticalAxisGroup.default-staff-staff-spacing.basic-distance = #staff-2-to-3-distance
        \override VerticalAxisGroup.default-staff-staff-spacing.minimum-distance = #0
        \override VerticalAxisGroup.default-staff-staff-spacing.padding = #0
        \override VerticalAxisGroup.default-staff-staff-spacing.stretchability = #0
      }
      {
        \time 3/4
        \override NoteHead.font-size = #-2
        \override Stem.details.beamed-lengths = #`(,arrow-stem-length)
        \override Stem.details.lengths = #`(,arrow-stem-length)
        \override TextScript.font-size = #-3
        \override Glissando.style = #'trill
        \override Glissando.bound-details.left.padding = #1.2
        \override Glissando.bound-details.right.padding = #1
        \override Accidental.stencil = ##f

        % DOWN ARROW NOTEHEAD
        % NoteColumn.X-offset: negative = left, positive = right
        \once \override NoteHead.stencil = #arrow-down-notehead
        \tweak NoteHead.extra-offset #'(0.45 . 0.3)
        \tweak NoteColumn.X-offset #-10
        c'4
        -\tweak outside-staff-priority ##f
        -\tweak font-size #lh-fingering-piano-fontsize
        -\tweak extra-offset #(cons lh-fingering-piano-x-offset lh-fingering-piano-y-offset)
        _\p
        \glissando

        % UP ARROW NOTEHEAD
        \once \override NoteHead.stencil = #arrow-up-notehead
        \tweak NoteHead.extra-offset #'(-0.4 . 0.3)
        \tweak NoteColumn.X-offset #-15.5
        g''4
        \glissando

        % DOWN ARROW NOTEHEAD
        \once \override NoteHead.stencil = #arrow-down-notehead
        \tweak NoteHead.extra-offset #'(0.45 . 0.3)
        \tweak NoteColumn.X-offset #-12.5
        c'4
      }

      % === R.H. PLUCK STAFF (Bottom - 4 lines) ===
      \new Staff \with {
        instrumentName = \markup {
          \override #`(font-name . "Crimson Pro Light Italic")
          \fontsize #instrument-name-font-size
          "R.H."
        }
        \omit TimeSignature
        \omit BarLine
        \omit Clef
        \omit KeySignature
        \override InstrumentName.extra-offset = #'(0.7 . 0)
        \override StaffSymbol.thickness = #1
        \override StaffSymbol.line-count = #4
        \override StaffSymbol.staff-space = #1.4
        \override StaffSymbol.stencil = #(make-custom-staff-stencil rh-pluck-staff-width)
      }
      {
        \time 3/4
        \override Stem.details.beamed-lengths = #'(4)
        \override Stem.direction = #up

        % Grace note figure: lines 1,4,3,2 (bottom to top) — X noteheads, 16th beamed
        % NoteColumn.X-offset: negative = left, positive = right (shifts entire grace group)
        \xHead
        \grace {
          \magnifyMusic #grace-note-magnification {
          \override NoteColumn.X-offset = #rh-grace-x-offset
          f'16[
          -\tweak outside-staff-priority ##f
          -\tweak extra-offset #'(-0.8 . -0.4)
          _\markup {
            \override #`(font-name . "Crimson Pro Light Italic")
            \fontsize #fb-text-fontsize
            "b.b."
          }
          -\tweak outside-staff-priority ##f
          -\tweak extra-offset #'(0 . 0)
          ^\markup {
            \with-dimensions #'(0 . 0) #'(0 . 0)
            \translate #'(-0.5 . -1.5)
            \override #'(thickness . 0.8)
            \path #0.15
            % BOX AROUND GRACE NOTE FIGURE: path rectangle
            % increase height from bottom: decrease B (moveto Y) and D (lineto Y)
            % increase height from top: increase F (lineto Y) and H (lineto Y)
            % increase width from right: increase C (lineto X) and E (lineto X)
            % increase width from left: decrease A (moveto X) and G (lineto X)
            #'((moveto  0 -3.5) ;A B
                              (lineto  4 -3.5) ;C D
                              (lineto  4 3.3) ;E F
                              (lineto  0 3.3) ;G H
                              (closepath))
          }
          e'' c'' a']
          
          \revert NoteColumn.X-offset
          }
        }
        \xHeadRevert
        s4
      }

    >>

    \layout {
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/24)
        \override GraceSpacing.spacing-increment = #grace-spacing-increment
        \override Beam.damping = #+inf.0
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
      line-width = 55\mm
      #(layout-set-staff-size 18)
    }

    \midi {}
  }
}

\version "2.20.0"
\language "english"

\paper{
  paper-width = 100
  paper-height = 500

  top-margin = 5
  bottom-margin = 10
  left-margin = 1
  right-margin = 1

  system-system-spacing =
  #'((basic-distance . 15)  %this controls space between lines default = 12
                            (minimum-distance . 8)
                            (padding . 2)
                            (stretchability . 60))
}

\book {
  \header {
    tagline = ##f %Do not display tagline
  }
  \score {
    <<
      \override Score.BarNumber.break-visibility = ##(#f #f #f) %The order of the three values is end of line visible, middle of line visible, beginning of line visible.

      \new Staff \with {
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1 %thickness of stafflines, ledger lines, and stems
        % \accidentalStyle dodecaphonic  modern modern-cautionary neo-modern default http://lilypond.org/doc/v2.18/Documentation/notation/displaying-pitches#automatic-accidentals

        % USER CHANGE: Custom shorter staff lines using Scheme stencil
        % Draws staff lines at 22mm width while keeping line-width at 30mm for notation spacing
        % Adjust the 22 value below for longer/shorter staff lines
        \override StaffSymbol.stencil = #(lambda (grob)
          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                 (line-count (ly:grob-property grob 'line-count 5))
                 (thickness (ly:grob-property grob 'thickness 1))
                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                 (width 3.55)  ; staff line width in mm
                 (width-staff-spaces (/ (* width 2.8346) staff-space))  ; convert mm to staff spaces
                 (half-height (* (/ (- line-count 1) 2) staff-space)))
            (apply ly:stencil-add
              (map (lambda (i)
                     (ly:make-stencil
                       (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                       (cons 0 width-staff-spaces)
                       (cons (- half-height) half-height)))
                   (iota line-count (- (/ (- line-count 1) 2)))))))
      }

      {
        \time 4/4
        \override TupletBracket.bracket-visibility = ##t
        \override TupletNumber.visibility = ##f
        %\once \override TupletNumber #'text = "7:4"
        %\set tupletFullLength = ##t %http://lilypond.org/doc/v2.19/Documentation/snippets/rhythms
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(5.5)
        \override Stem.details.lengths = #'(5.5)
        % \override NoteColumn.accent-skip = ##t
        \override Accidental.font-size = -4

        %/////////////////////////////////////////////////////////////////////
        %////////////////////////////////////////////////////////////////////
        % NOTATION HERE /////////////////////////////////////////////////////

        \override Stem.transparent = ##t
        % 2. Tells LilyPond it's okay to draw a hairpin that is almost zero length
        % Without this, LilyPond defaults to a minimum length (usually 2-3 units)
        \override Hairpin.minimum-length = #0.1
        % 3. This is the "secret sauce": it tells the layout engine to pretend the
        % "ppp" text has no width. This allows the hairpin to start immediately
        % instead of being pushed to the right by the edges of the text.
        \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)
        % 4. Removes the mandatory gap between the dynamic (ppp) and the start of the hairpin.
        \override Hairpin.bound-details.left.padding = #0
        % USER CHANGE: Shift entire hairpin left using extra-offset
        % extra-offset #'(X . Y) - negative X moves left
        \override Hairpin.extra-offset = #'(-1 . 0)

        % USER CHANGE: Shift notation left to start closer to left edge of staff
        % Moves the note column (and all attached elements like dynamics, hairpin, text)
        % 2 staff spaces to the left. Adjust the #-2 value for more/less shift.
        \once \override NoteColumn.X-offset = #-0.8

        % E-flat 6 half note with ppp dynamic and crescendo hairpin
        % Two text markings above: "Non-Vib" and "secco" in Crimson Pro Light Italic
        ef'''2\ppp\<^\markup {
          \override #'(font-name . "Crimson Pro Light Italic")
          \fontsize #-6
          "Non-Vib"
        }
        % USER CHANGE: "secco" positioned below staff, to the right of crescendo end
        % Using \tweak extra-offset to shift this specific markup
        % extra-offset #'(X . Y) where X=right shift, Y=vertical shift (positive=up)
        -\tweak extra-offset #'(6.7 . 1.3)
        _\markup {
          \override #'(font-name . "Crimson Pro Light Italic")
          \fontsize #-6
          "secco"
        }

        % 4. The spacer to end the hairpin
        s4\!

      }

    >>

    \layout{
      \context {
        \Score
        %proportionalNotationDuration = #(ly:make-moment 1/20) %smallest space quintuplet or 5*4
        proportionalNotationDuration = #(ly:make-moment 1/28)
        %\override SpacingSpanner.uniform-stretching = ##t
        %  \override SpacingSpanner.strict-note-spacing = ##t
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
        % \override NoteHead.no-ledgers = ##t
      }

      indent = 0
      %line-width = 158
      line-width = 28\mm
      #(layout-set-staff-size 20) %staff height
      % \hide Stem
      %\hide NoteHead
      % \hide LedgerLineSpanner
      % \hide TupletNumber 
    }

    \midi{}

  }
}


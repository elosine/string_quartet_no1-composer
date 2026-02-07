\version "2.20.0"
\language "english"

% George Crumb - Black Angels (1970) - Extended Pizzicato Techniques
% Thimble-capped finger trilling and metal pick (paper clip) pizzicato
% Electric string quartet with extreme extended techniques
% Notation includes special symbols and text instructions

\paper{
  paper-width = 200
  paper-height = 500

  top-margin = 5
  bottom-margin = 10
  left-margin = 1
  right-margin = 1

  system-system-spacing =
  #'((basic-distance . 15)
                            (minimum-distance . 8)
                            (padding . 2)
                            (stretchability . 60))
}

\book {
  \header {
    tagline = ##f
  }
  \score {
    <<
      \override Score.BarNumber.break-visibility = ##(#f #f #f)

      \new Staff \with {
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1

        % Custom staff lines
        \override StaffSymbol.stencil = #(lambda (grob)
                                          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                                 (line-count (ly:grob-property grob 'line-count 5))
                                                 (thickness (ly:grob-property grob 'thickness 1))
                                                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                                 (width 55)
                                                 (width-staff-spaces (/ (* width 2.8346) staff-space))
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
        \override TupletBracket.bracket-visibility = ##f
        \override TupletNumber.visibility = ##f
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(5)
        \override Stem.details.lengths = #'(6)
        \override Accidental.font-size = -4
        \override TextScript.font-size = #-2

        % === THIMBLE TRILL ===
        % Crumb notation: trilling on strings with thimble-capped fingers
        % Creates metallic, insect-like sound ("Night of the Electric Insects")
        
        \once \override TextScript.extra-offset = #'(-3 . 4)
        \once \override TextScript.font-size = #-3
        
        % Thimble trill - rapid alternation with metal thimbles on fingers
        % Notated with trill line and text instruction
        e''4^\markup { 
          \column { 
            \italic "thimble trill" 
            \tiny "(metal thimbles on fingers)"
          }
        }
        \startTrillSpan
        s4 s4 s4
        \stopTrillSpan
        
        \bar "||"
        
        % === METAL PICK (PAPER CLIP) ===
        % Harsh, metallic pizzicato attack
        
        \once \override TextScript.extra-offset = #'(-2 . 3.5)
        
        % X noteheads often used for indefinite pitch/noise elements
        \once \override NoteHead.style = #'cross
        c''8^\markup { 
          \column { 
            \italic "metal pick" 
            \tiny "(paper clip)"
          }
        }
        \once \override NoteHead.style = #'cross
        c''8
        \once \override NoteHead.style = #'cross
        c''8
        \once \override NoteHead.style = #'cross
        c''8
        
        % Regular pizz with pick for comparison
        \once \override TextScript.extra-offset = #'(-1 . 2.5)
        e''8^\markup { \italic "pizz. (pick)" }
        g''8
        e''8
        c''8

      }

    >>

    \layout{
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/28)
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
      }

      indent = 0
      line-width = 160\mm
      #(layout-set-staff-size 20)
    }

    \midi{}

  }
}

\version "2.24.4"

#(set-global-staff-size 20)

% ============================================
% ADJUSTABLE PARAMETERS
% ============================================

% NoteColumn X-offset (negative = left, positive = right)
#(define note-x-offset -0.7)

% Down-bow marks — independent positioning per mark
% Mark 1 (top)
#(define downbow-1-fontsize -4)
#(define downbow-1-x-offset 0)
#(define downbow-1-y-offset 0)
% Mark 2 (middle)
#(define downbow-2-fontsize -4)
#(define downbow-2-x-offset -2)
#(define downbow-2-y-offset 0)
% Mark 3 (bottom)
#(define downbow-3-fontsize -4)
#(define downbow-3-x-offset -1)
#(define downbow-3-y-offset 0)

% =====================================================================
% PAPER SECTION BEGIN
% This section defines the physical dimensions of the page, margins,
% and the spacing between the systems (the musical staves).
% =====================================================================
\paper{
  paper-width = 130\mm
  paper-height = 500\mm
  top-margin = 5\mm
  bottom-margin = 10\mm
  left-margin = 1\mm
  right-margin = 1\mm
  system-system-spacing =
  #'((basic-distance . 15) %this controls space between lines default = 12
                           (minimum-distance . 8)
                           (padding . 2)
                           (stretchability . 60))
}% PAPER SECTION END
% =====================================================================
% BOOK BLOCK BEGIN
% The 'book' is the top-level container for your score and headers.
% =====================================================================
\book {
  % HEADER SECTION BEGIN
  % Controls metadata like titles, composers, and the tagline at the bottom.
  \header {
    tagline = ##f %Do not display tagline
  } % HEADER SECTION END

  % SCORE BLOCK BEGIN
  % This is the container for the actual musical data and layout instructions.
  \score {

    <<
      % These brackets allow multiple staves or global settings to happen at once.

      % Global Score overrides (applies to all staves)

      % STAFF DEFINITION BEGIN
      % \new Staff creates the staff; \with { ... } applies specific settings to it.
      \new Staff \with {
        \omit TimeSignature
        \omit BarLine
        \clef treble
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.stencil = ##f %hide staff lines
        % \accidentalStyle dodecaphonic  modern modern-cautionary neo-modern default http://lilypond.org/doc/v2.18/Documentation/notation/displaying-pitches#automatic-accidentals
      }% STAFF DEFINITION END

      % MUSICAL CONTENT BEGIN {
      % This inner bracket contains the actual notes and rhythmic data.
      {
        \time 4/4
        \override TupletBracket.bracket-visibility = ##t
        \override TupletNumber.stencil = ##f
        %\once \override TupletNumber #'text = "7:4"
        %\set tupletFullLength = ##t %http://lilypond.org/doc/v2.19/Documentation/snippets/rhythms
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(5.5)
        \override Stem.details.lengths = #'(7.5)
        % \override NoteColumn.accent-skip = ##t
        \override Accidental.font-size = #-4
        %         \stopStaff

        % NOTATION SETTINGS
        % 1. Makes the note stems invisible (purely for your specific visual style)
        \override Stem.transparent = ##F
        % 2. Tells LilyPond it's okay to draw a hairpin that is almost zero length
        % Without this, LilyPond defaults to a minimum length (usually 2-3 units)
        \override Hairpin.minimum-length = #0.1
        % 3. This is the "secret sauce": it tells the layout engine to pretend the
        % "ppp" text has no width. This allows the hairpin to start immediately
        % instead of being pushed to the right by the edges of the text.
        \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)
        % 4. Removes the mandatory gap between the dynamic (ppp) and the start of the hairpin.
        % Setting this to 0 lets the hairpin touch the dynamic text.
        \override Hairpin.bound-details.left.padding = #0
        % Glissando Style Settings
        \override Glissando.style = #'zigzag
        \override Glissando.bound-details.left.padding = #0.5
        \override Score.BarNumber.break-visibility = ##(#f #f #f) %The order of the three values is end of line visible, middle of line visible, beginning of line visible.



        % --- THE NOTES ---

        % Black square notehead for overpressure
        \once \override NoteHead.stencil = #ly:text-interface::print
        \once \override NoteHead.text = \markup {
          \filled-box #'(-0.4 . 0.4) #'(-0.4 . 0.4) #0
        }

        % D5 quarter note with marcato, sfz, and three stacked down-bows
        \once \override NoteColumn.X-offset = #note-x-offset
        d''16^\markup {
          \overlay {
            \translate #(cons downbow-1-x-offset downbow-1-y-offset)
            \fontsize #downbow-1-fontsize \musicglyph "scripts.downbow"
            \translate #(cons downbow-2-x-offset downbow-2-y-offset)
            \fontsize #downbow-2-fontsize \musicglyph "scripts.downbow"
            \translate #(cons downbow-3-x-offset downbow-3-y-offset)
            \fontsize #downbow-3-fontsize \musicglyph "scripts.downbow"
          }
        }_\marcato_\p



        
      }% MUSICAL CONTENT END }
      
    >> % SIMULTANEOUS MUSIC END >>

    % LAYOUT BLOCK BEGIN
    % Controls the visual appearance (fonts, spacing, line-width) of the score.
    \layout{
      % CONTEXT SCORE BEGIN
      % Specific rules for how the score-level spacing behaves.
      \context {
        \Score
        % Sets proportional spacing (notes take up space based on duration)
        %proportionalNotationDuration = #(ly:make-moment 1/20) %smallest space quintuplet or 5*4
        proportionalNotationDuration = #(ly:make-moment 1/28)
        %\override SpacingSpanner.uniform-stretching = ##t
        %  \override SpacingSpanner.strict-note-spacing = ##t
        %  \override SpacingSpanner.strict-grace-spacing = ##t
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
        % \override NoteHead.no-ledgers = ##t 
      }% CONTEXT SCORE END

      indent = 0
      line-width = 40\mm
      % staff height set at top level with #(set-global-staff-size 20)
      % \hide Stem
      % \hide NoteHead
      % \hide LedgerLineSpanner
      % \hide TupletNumber 
    }% LAYOUT BLOCK END

    % MIDI BLOCK BEGIN
    % Generates a MIDI file for playback in REAPER or other DAWs.
    \midi{}
    % MIDI BLOCK END

  }% SCORE BLOCK END
}% BOOK BLOCK END


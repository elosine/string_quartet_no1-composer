\version "2.20.0"
\language "english"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║                    MASTER LILYPOND TEMPLATE                               ║
% ║                    String Quartet No.1 — Composer                         ║
% ╠════════════════════════════════════════════════════════════════════════════╣
% ║  A unified repository of all look-and-feel settings, techniques, and     ║
% ║  notation patterns used in this project. Organized by functional group    ║
% ║  with a toggle system for easy activation/deactivation.                  ║
% ║                                                                          ║
% ║  HOW TO USE:                                                             ║
% ║    1. Set feature toggles to ##t (on) or ##f (off) in Section 1          ║
% ║    2. Set variable values (pitches, clef, etc.) in Section 2             ║
% ║    3. The notation in Section 6 uses conditional \if blocks              ║
% ║    4. Compile to see the result — adjust values as needed                ║
% ║                                                                          ║
% ║  AI INSTRUCTIONS:                                                        ║
% ║    When the user says "enable hairpin" — set useHairpin = ##t            ║
% ║    When the user says "wider hairpin" — increase hairpinHeight           ║
% ║    When the user says "enable vibrato" — set useVibrato = ##t            ║
% ║    When the user says "enable glissando" — set useGlissando = ##t        ║
% ║    When the user says "enable secco" — set useSeccoText = ##t            ║
% ║    When the user says "enable non-vib text" — set useNonVibText = ##t    ║
% ║    When the user says "bartok pizz" — set useBartokPizz = ##t            ║
% ║    When the user says "col legno" — set useColLegnoBattuto = ##t         ║
% ║    When the user says "harmonics" — set useHarmonics = ##t               ║
% ║    When the user says "box around chord" — set useChordBox = ##t         ║
% ║    When the user says "tuplet" — set useTuplet = ##t                     ║
% ║    See Section 1 for all available toggles.                              ║
% ╚════════════════════════════════════════════════════════════════════════════╝


% =====================================================================
% SECTION 0: SCHEME HELPER FUNCTIONS
% =====================================================================
% ; (Scheme comments use semicolons, not percent signs)
% ; These must be defined before any LilyPond code that uses them.

% --- Custom Staff Line Width Stencil ---
% ; Replaces default staff lines with lines of a specific width in mm.
% ; The 'width' variable (in mm) controls how wide the staff lines are.
% ; Used in virtually every file in this project.
% ; Variations found:
% ;   0.8 mm  — Cello_E2_cell.ly (very short, for tiny cells)
% ;   1.2 mm  — BartokPizz files (short, single-note)
% ;   2.0 mm  — CrescendoSinglePitchTemplate.ly
% ;   2.4 mm  — GlissandoNotationTemplate.ly, CrescendoGlissandoTemplate.ly
% ;   2.8 mm  — Vibrato templates
% ;   2.9 mm  — Crescendo instance files (glissando + single pitch)
% ;   3.0 mm  — Crescendo-Viola-D3.ly (draft)
% ; >>> STAFF LINE WIDTH — CHANGE THIS VALUE <<<
% ; Common values: 0.8 (tiny), 1.2 (short), 2.0-2.4 (medium), 2.8-3.0 (wide)
% --- Flatten Tuplet Bracket ---
% ; Forces tuplet brackets to be perfectly horizontal (flat).
% ; Sets both ends to the maximum calculated position.
#(define (flatten-tuplet-bracket grob)
   (let* ((pos (ly:grob-property grob 'positions))
          (max-pos (max (car pos) (cdr pos))))
     (ly:grob-set-property! grob 'positions (cons max-pos max-pos))))

#(define staff-line-width-mm 2.4)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 2.8346) staff-space))
            (half-height (* (/ (- line-count 1) 2) staff-space)))
       (apply ly:stencil-add
              (map (lambda (i)
                     (ly:make-stencil
                      (list 'draw-line line-thickness
                            0 (* i staff-space)
                            width-staff-spaces (* i staff-space))
                      (cons 0 width-staff-spaces)
                      (cons (- half-height) half-height)))
                   (iota line-count (- (/ (- line-count 1) 2))))))))


% --- Dynamic Vibrato Wavy Line (SVG-Compatible) ---
% ; Adapted from Mark Witmer's vibrato.ly for LilyPond 2.20+ SVG output.
% ; Uses make-path-stencil (renders in SVG backend) instead of embedded-ps.
% ;
% ; Usage: \vibrato #'(startAmp ... endAmp) #wavelength #lineThickness #widthFraction
% ;   amplitudes : list of amplitude values, linearly interpolated across the span
% ;     #'(3.0 0.0)       = wide vibrato → non-vibrato (Wide-to-Narrow)
% ;     #'(0.0 3.0)       = non-vibrato → wide vibrato (Narrow-to-Wide)
% ;     #'(0.0 4.0)       = non-vibrato → very wide
% ;     #'(2.0 4.0 0.0)   = medium → wide → none (3-point envelope)
% ;     #'(0.5 3.0 0.0)   = narrow → wide → none
% ;   wavelength : width of one full wave cycle in staff spaces (default: 1.0)
% ;   thickness  : line thickness (default: 0.15)
% ;   widthFrac  : fraction of available span to use (default: 0.65)
% ;     0.65 = 65% of span (leaves room for dynamics/text at ends)
% ;     0.85 = 85% of span (tighter fit)
% ;
% ; Requires \startTrillSpan / \stopTrillSpan on the notes.
% ; Hide the "tr" symbol with: \override TrillSpanner.bound-details.left.text = ##f

#(define (build-vibrato-stencil grob amplitudes wavelength thick width-frac)
  (let* ((ext (ly:grob-property grob 'X-extent))
         (x0 (car ext))
         (x1 (cdr ext))
         (raw-width (- x1 x0))
         (width (* raw-width width-frac)))
    (if (or (inf? x0) (inf? x1) (<= width 0))
        empty-stencil
        (let* ((half-wl (/ wavelength 2.0))
               (num-halves (max 1 (inexact->exact (round (/ width half-wl)))))
               (hw (/ width num-halves))
               (na (length amplitudes))
               (cmds
                (let loop ((i 0) (x 0.0) (acc '(moveto 0 0)))
                  (if (>= i num-halves)
                      acc
                      (let* ((t (if (<= num-halves 1) 0.5
                                    (min 1.0 (/ (exact->inexact i)
                                                (max 1 (- num-halves 1))))))
                             (amp
                              (if (= na 1)
                                  (list-ref amplitudes 0)
                                  (let* ((fpos (* t (- na 1)))
                                         (fi (min (- na 2)
                                                  (inexact->exact (floor fpos))))
                                         (ff (- fpos fi)))
                                    (+ (list-ref amplitudes fi)
                                       (* ff (- (list-ref amplitudes (+ fi 1))
                                                (list-ref amplitudes fi)))))))
                             (dir (if (even? i) 1.0 -1.0))
                             (cp-y (* dir amp 1.333))
                             (cx1 (+ x (* hw 0.333)))
                             (cx2 (+ x (* hw 0.667)))
                             (xe  (+ x hw)))
                        (loop (+ i 1) xe
                              (append acc
                                      (list 'curveto cx1 cp-y
                                            cx2 cp-y xe 0.0))))))))
          (make-path-stencil cmds thick 1 1 #f)))))

vibrato =
#(define-music-function (amplitudes wavelength thickness width-frac)
   (list? number? number? number?)
   #{
     \once \override TrillSpanner.after-line-breaking =
       #(lambda (grob)
          (ly:grob-set-property! grob 'stencil
            (build-vibrato-stencil grob amplitudes wavelength thickness width-frac)))
   #})


% =====================================================================
% SECTION 1: FEATURE TOGGLES
% =====================================================================
% Set each toggle to ##t (enabled) or ##f (disabled).
% These control which settings and notation blocks are active.

% --- Notation Feature Toggles ---
useGlissando = ##t           % Glissando line between two pitches
useHairpin = ##t             % Crescendo/decrescendo hairpin
useVibrato = ##f             % Dynamic vibrato wavy line (requires Scheme above)
useBartokPizz = ##f          % Bartók pizzicato (snap pizz)
useColLegnoBattuto = ##f     % Col legno battuto (block notehead)
useHarmonics = ##f           % Diamond-shaped harmonic noteheads
useTuplet = ##f              % Tuplet bracket + number overrides

% --- Text Annotation Toggles ---
useNonVibText = ##t          % "Non-Vib" text above staff
useSeccoText = ##t           % "secco" text below staff
useDynamic1 = ##t            % First dynamic marking (on/near note 1)
useDynamic2 = ##t            % Second dynamic marking (on/near note 2 or spacer)

% --- Visual Feature Toggles ---
useChordBox = ##f            % Rectangle drawn around a chord
useCustomStaffLines = ##t    % Custom short staff lines (vs default full-width)
% useStemVisible: stems are transparent by default in this project.
% To show stems (e.g., for Bartók pizz), uncomment the override in Section 5A.


% =====================================================================
% SECTION 2: CONFIGURABLE VALUES
% =====================================================================
% Change these to customize the output without touching the notation.

% --- Staff ---
% staffLineWidth: Controlled by Scheme variable staff-line-width-mm in Section 0.
% ; To change: edit the #(define staff-line-width-mm 2.4) line at the top.
% ; Presets:
% ;   0.8  = tiny (single-cell notation like Cello_E2_cell)
% ;   1.2  = short (Bartók pizz single notes)
% ;   2.0  = medium-short (crescendo single pitch)
% ;   2.4  = medium (glissando, crescendo glissando templates) ← DEFAULT
% ;   2.8  = medium-wide (vibrato templates)
% ;   2.9  = wide (crescendo instance files)
% ;   3.0  = extra-wide (Crescendo-Viola-D3 draft)

staffThickness = #1
% ; Thickness of staff lines themselves (default: 1)

% --- Noteheads ---
noteHeadSize = #-3.3
% ; Font size for noteheads. Default LilyPond is 0.
% ; Variations:
% ;   #-2   — earlier project files (sf004, crescendo templates)
% ;   #-3.3 — current standard ← DEFAULT

accidentalSize = #-4
% ; Font size for accidentals.
% ; Variations found:
% ;   #-4  — BartokPizz files, sf004 templates ← DEFAULT (current)
% ;   #-5  — Crescendo templates, most instance files (previous default)
% ;   #-6  — GlissandoNotationTemplate (smallest)

% --- Rests ---
restSize = #-4
% ; Font size for rests. ~35% smaller than default.
% ; Default LilyPond is 0. Negative = smaller.

% --- Stems ---
stemBeamedLengths = #'(6)
% ; Length of beamed stems.
% ; Variations:
% ;   #'(5.5) — earlier project files, Cello_E2_cell.ly
% ;   #'(6)   — current standard ← DEFAULT
% ;   #'(7)   — previous standard
% ;   (commented #'(7) also found in sf004 templates)

stemLengths = #'(6)
% ; Length of unbeamed stems.
% ; Variations:
% ;   #'(5.5) — Cello_E2_cell.ly, sf004 templates
% ;   #'(6)   — current standard ← DEFAULT
% ;   #'(6.5) — BartokPizz-Viola-A3.ly
% ;   #'(7)   — previous standard

% --- Dynamics ---
dynamicTextSize = #-8.5
% ; Font size for dynamic markings (ppp, fff, etc.).
% ; Variations found:
% ;   #-6   — BartokPizz files, Col_Bat_integrated (larger, more visible)
% ;   #-7   — GlissandoNotationTemplate
% ;   #-8.5 — Crescendo templates ← DEFAULT
% ;   #-9   — Vibrato templates (smallest)

dynamicLineSpannerPadding = #0
% ; Extra padding below staff for DynamicLineSpanner.
% ; Set to #1.2 when notes have ledger lines below the staff
% ; (pushes dynamics further down to avoid collision).
% ; #0 = default (no extra padding)

% --- Hairpin ---
hairpinHeight = #0.65
% ; Height of the hairpin opening (default LilyPond: ~0.66).
% ; Variations found:
% ;   #0.5  — Vibrato templates (small, fits under vibrato line)
% ;   #0.65 — CrescendoGlissandoTemplate (latest) ← DEFAULT
% ;   #0.7  — Crescendo instance files, old template
% ;   #1.1  — Crescendo-Viola-D3_draft.ly (very tall, experimental)
% ; >>> To make hairpin wider/taller: increase this value
% ; >>> To make hairpin narrower: decrease this value

hairpinYOffset = #-0.3
% ; Vertical position of hairpin (negative = lower).
% ; #-0.3 is standard for crescendo files.
% ; #-0.9 is used in vibrato templates (much lower, under vibrato line).

hairpinMinLength = #0
% ; Minimum length of hairpin. Default: 0 (no minimum).
% ; Crescendo-Viola-D3_draft.ly used #0.0 explicitly.
% ; Cello_E2_cell.ly used #0.1.

% --- Glissando ---
glissYOffset = #0
% ; Y offset for glissando line. Use:
% ;   #0   — default (notes on different staff lines)
% ;   #0.3 — when both notes sit on the same staff line (e.g., A4→Ab4)

glissLeftPadding = #0.4
% ; Gap between left notehead and start of glissando line.
% ; #0.2 in GlissandoNotationTemplate, #0.4 in CrescendoGlissandoTemplate.

glissRightPadding = #-0.1
% ; Gap between end of glissando line and right notehead.
% ; Negative = line extends closer to/past the notehead.

% --- Vibrato ---
vibratoAmplitudes = #'(3.0 0.0)
% ; Amplitude envelope for vibrato wave.
% ; Presets:
% ;   #'(3.0 0.0)       — Wide → None (Wide-to-Narrow / decrescendo feel)
% ;   #'(0.0 3.0)       — None → Wide (Narrow-to-Wide / crescendo feel)
% ;   #'(0.0 4.0)       — None → Very Wide
% ;   #'(2.0 4.0 0.0)   — Medium → Wide → None (3-point envelope)
% ;   #'(0.5 3.0 0.0)   — Narrow → Wide → None

vibratoWavelength = #1.0
% ; Width of one full wave cycle in staff spaces.

vibratoThickness = #0.15
% ; Line thickness of vibrato wave.

vibratoWidthFrac = #0.65
% ; Fraction of available horizontal span to fill with vibrato.
% ; 0.65 = 65% (leaves room for text/dynamics at ends)
% ; 0.85 = 85% (tighter fit)

vibratoYOffset = #3.5
% ; Vertical position of vibrato wavy line above staff.

% --- Note Column Positioning ---
noteColumnOffset1 = #-1.5
% ; X offset for first note column (pushes note left).
% ; Variations:
% ;   #-0.7  — GlissandoNotationTemplate (less shift)
% ;   #-0.8  — BartokPizz files
% ;   #-1.2  — Crescendo instance files
% ;   #-1.4  — Vibrato templates
% ;   #-1.5  — CrescendoGlissandoTemplate ← DEFAULT
% ;   #-1.6  — Cello_E2_cell.ly

noteColumnOffset2 = #-1
% ; X offset for second note column (in two-note glissando).
% ; Used in crescendo glissando template.

% --- Text ---
textFontName = "Crimson Pro Light Italic"
% ; Font used for all text annotations (Non-Vib, secco, c.l. batt., etc.)

textFontSize = #-6
% ; Size for text annotations.
% ; Variations:
% ;   #-6  — Crescendo templates, most files ← DEFAULT
% ;   #-9  — Vibrato templates (smaller to fit with vibrato line)

% --- Hairpin Tweaks (per-instance, applied with \tweak) ---
hairpinExtraOffsetX = #-0.8
% ; X shift for hairpin start position.

hairpinExtraOffsetY = #0
% ; Y shift for hairpin. Vibrato templates use #1.2 to push below vibrato line.

hairpinShortenRight = #-1.8
% ; How much to shorten the right end of the hairpin.
% ; Positive = shorter. Negative = longer (extends past note).
% ; Variations:
% ;   #-1.8  — CrescendoGlissandoTemplate (extends right) ← DEFAULT
% ;   #0     — Old template (no shortening)
% ;   #1.5   — Crescendo-Viola-D3_draft.ly
% ;   #4     — CrescendoSinglePitchTemplate (very short)
% ;   #4.5   — Crescendo instance files with glissando
% ;   #5.8   — Crescendo_Gliss-Violin1-As3-A3.ly (instance-specific)
% ;   #7     — Vibrato templates (very short, room for vibrato)

% --- Paper Size Presets ---
% ; These are NOT toggles — just reference values.
% ; Uncomment the preset you want in the \paper block, or set custom values.
% ;
% ; BARTOK PIZZ (single note):     paper-width=9mm,  paper-height=21mm, line-width=37mm
% ; GLISSANDO (two notes):         paper-width=19mm, paper-height=20mm, line-width=18mm
% ; CRESCENDO SINGLE PITCH:        paper-width=22mm, paper-height=25mm, line-width=50mm
% ; CRESCENDO GLISSANDO:           paper-width=23mm, paper-height=25mm, line-width=50mm
% ; CRESCENDO INSTANCE (old):      paper-width=17mm, paper-height=20-25mm, line-width=50mm
% ; VIBRATO:                       paper-width=80mm, paper-height=40mm, line-width=55mm
% ; COL LEGNO BATTUTO:             paper-width=130mm, paper-height=500mm, line-width=20mm
% ; CELLO CELL:                    paper-width=130mm, paper-height=500mm, line-width=37mm


% =====================================================================
% SECTION 3: PAPER
% =====================================================================
\paper {
  tagline = ##f
  % --- Adjust these for your notation type ---
  paper-width = 23\mm
  paper-height = 25\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm

  % --- Uncomment for multi-system scores (Col Legno, Cello cell, etc.) ---
  % system-system-spacing =
  % #'((basic-distance . 15)
  %    (minimum-distance . 8)
  %    (padding . 2)
  %    (stretchability . 60))
}


% =====================================================================
% SECTION 4: CUSTOM NOTATION DEFINITIONS
% =====================================================================

% --- Col Legno Battuto block notehead ---
% Used for percussive cluster notation on RhythmicStaff.
% Creates a filled rectangle instead of a normal notehead.
blockHead = {
  \override NoteHead.stencil = #ly:text-interface::print
  \override NoteHead.text = \markup {
    \filled-box #'(-0.6 . 0.6) #'(-1.5 . 1.5) #0
  }
}


% =====================================================================
% SECTION 5: SCORE
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    % === CLEF ===
    % Options: \clef treble, \clef alto, \clef bass
    \clef treble
    \omit Clef
    \omit KeySignature

    \override StaffSymbol.thickness = \staffThickness

    % --- Custom Staff Lines ---
    % Uses the Scheme function defined in Section 0.
    % Width controlled by staffLineWidthMM variable in Section 2.
    \override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    % =================================================================
    % SECTION 5A: GLOBAL OVERRIDES
    % =================================================================
    % These apply to the entire score and are always active.

    \time 4/4

    % --- Noteheads ---
    \override NoteHead.font-size = \noteHeadSize

    % --- Accidentals ---
    \override Accidental.font-size = \accidentalSize

    % --- Dynamics ---
    \override DynamicText.font-size = \dynamicTextSize

    % --- Rests ---
    \override Rest.font-size = \restSize

    % --- Stems ---
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = \stemBeamedLengths
    \override Stem.details.lengths = \stemLengths

    % --- Stem Visibility ---
    % Stems visible by default. Change ##f to ##t to hide.
    \override Stem.transparent = ##f

    % --- Beams ---
    \override Beam.damping = #+inf.0  % forces perfectly flat/horizontal beams (no slope)

    % =================================================================
    % SECTION 5B: CONDITIONAL FEATURE OVERRIDES
    % =================================================================
    % Each feature's overrides are grouped together.
    % Active features apply their overrides; inactive features are skipped.
    % In LilyPond 2.20, we can't do runtime conditionals easily,
    % so we use the "comment/uncomment" approach guided by the toggles above.
    % The AI reads the toggle values and comments/uncomments accordingly.

    % -----------------------------------------------------------------
    % HAIRPIN SETTINGS
    % -----------------------------------------------------------------
    % [TOGGLE: useHairpin]
    % Active when useHairpin = ##t
    %
    % height: Controls how tall/wide the hairpin opens.
    %   Small (0.5) = subtle, for vibrato context
    %   Medium (0.65) = default for crescendo
    %   Large (0.7-1.1) = prominent, standalone crescendo
    %
    % Y-offset: Vertical position (negative = lower)
    %   -0.3 = standard (slightly below default)
    %   -0.9 = low (under vibrato wavy line)
    %
    % minimum-length: Set > 0 to force hairpin to appear even in tight spaces.
    %
    % To make wider:  increase height, decrease shorten-pair right value
    % To make taller: increase height
    % To move down:   decrease Y-offset (more negative)
    % To move up:     increase Y-offset (less negative or positive)
    \override Hairpin.height = \hairpinHeight
    \override Hairpin.Y-offset = \hairpinYOffset
    % \override Hairpin.minimum-length = \hairpinMinLength
    % \override Hairpin.bound-details.left.padding = #0
    %   ^ Uncomment to remove left-side padding on hairpin

    % --- DynamicLineSpanner ---
    % Uncomment when notes have ledger lines BELOW the staff
    % (pushes dynamics + hairpin further down to avoid collision):
    % \override DynamicLineSpanner.staff-padding = \dynamicLineSpannerPadding

    % --- DynamicText extra-spacing-width ---
    % Uncomment to prevent dynamics from affecting horizontal spacing:
    % \once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)

    % -----------------------------------------------------------------
    % VIBRATO SETTINGS
    % -----------------------------------------------------------------
    % [TOGGLE: useVibrato]
    % Active when useVibrato = ##t
    % Requires the Scheme function defined in Section 0.
    %
    % To change vibrato direction:
    %   Wide→Narrow (decrescendo feel): vibratoAmplitudes = #'(3.0 0.0)
    %   Narrow→Wide (crescendo feel):   vibratoAmplitudes = #'(0.0 3.0)
    %
    % To change vibrato intensity: adjust amplitude values (0=none, 4=very wide)
    % To change wave density: adjust vibratoWavelength (smaller = denser waves)
    % To change line weight: adjust vibratoThickness
    % To fill more/less of the span: adjust vibratoWidthFrac
    % To move the wavy line up/down: adjust vibratoYOffset

    % \override TrillSpanner.bound-details.left.text = ##f  % Hide "tr" symbol
    % \override TrillSpanner.Y-offset = \vibratoYOffset
    % \vibrato \vibratoAmplitudes \vibratoWavelength \vibratoThickness \vibratoWidthFrac

    % -----------------------------------------------------------------
    % TUPLET SETTINGS
    % -----------------------------------------------------------------
    % [TOGGLE: useTuplet]
    % Active when useTuplet = ##t
    %
    % Bracket: visible, flat/horizontal, above notes
    \override TupletBracket.bracket-visibility = ##t
    \override TupletBracket.direction = #UP
    \override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
    \override TupletBracket.padding = #0.5     % bracket height: lower = closer to notes (try 0.5, 1, 1.5, 2, 3)
    %
    % Number: show ratio (e.g., "5:4", "6:4"), smaller font
    \override TupletNumber.text = #tuplet-number::calc-fraction-text
    \override TupletNumber.font-size = #-5
    %
    % Alternative number approaches (uncomment to try):
    % \override TupletNumber.visibility = ##f              % hide numbers entirely (sf004 default)
    % \override TupletNumber.stencil = ##f                 % hide numbers (Cello_E2_cell.ly)
    % \once \override TupletNumber.text = "7:4"            % manual per-tuplet ratio text
    % \once \override TupletNumber.text =
    %   #(tuplet-number::non-default-tuplet-fraction-text 5 2)  % built-in ratio function
    %
    % Individual bracket height (use \once before a specific \tuplet):
    % \once \override TupletBracket.positions = #'(10 . 10)  % both values equal = flat
    %
    % Full-length tuplet bracket (extends to fill full duration):
    % \set tupletFullLength = ##t

    % -----------------------------------------------------------------
    % GLISSANDO STYLE OVERRIDE
    % -----------------------------------------------------------------
    % [TOGGLE: useGlissando]
    % Uncomment for zigzag glissando style (from Cello_E2_cell.ly):
    % \override Glissando.style = #'zigzag
    % \override Glissando.bound-details.left.padding = #0.5

    % -----------------------------------------------------------------
    % BREAKABLE SPANNERS (for multi-system scores)
    % -----------------------------------------------------------------
    % From sf004 templates. Uncomment if notation spans multiple systems:
    % \override Beam.breakable = ##t
    % \override Glissando.breakable = ##t
    % \override TextSpanner.breakable = ##t

    % -----------------------------------------------------------------
    % BAR NUMBER VISIBILITY
    % -----------------------------------------------------------------
    % Uncomment to hide bar numbers:
    % \override Score.BarNumber.break-visibility = ##(#f #f #f)


    % -----------------------------------------------------------------
    % STOP/START STAFF (from sf004 templates)
    % -----------------------------------------------------------------
    % Hide staff mid-score (notes still play but no staff lines):
    %   \stopStaff
    %   \override NoteHead.transparent = ##t
    %   \override NoteHead.no-ledgers = ##t
    %   \override Script.transparent = ##t
    %   \override Stem.transparent = ##t
    %   \override TupletBracket.bracket-visibility = ##f
    %   \override TupletNumber.transparent = ##t
    %   \override Staff.Clef.transparent = ##t
    %   \override Staff.BarLine.transparent = ##t
    %
    % Restart staff (make everything visible again):
    %   \startStaff
    %   \override NoteHead.transparent = ##f
    %   \override NoteHead.no-ledgers = ##f
    %   \override Script.transparent = ##f
    %   \override Stem.transparent = ##f
    %   \override TupletBracket.bracket-visibility = ##t
    %   \override TupletNumber.transparent = ##f
    %   \override Staff.Clef.transparent = ##f
    %   \override Staff.BarLine.transparent = ##f

    % -----------------------------------------------------------------
    % OPEN STRING & LAISSEZ VIBRER (LET RING)
    % -----------------------------------------------------------------
    % Open string: ^\markup { \teeny "o" }  ← CHOSEN
    % Other options (not currently used):
    %   \flageolet                                    % slightly larger circle (Feta)
    %   \open                                         % standard small circle (Feta)
    %   ^\markup { \musicglyph #"scripts.open" }      % explicit glyph
    %   ^\markup { \circle \null }                    % drawn circle
    %
    % Laissez vibrer (let ring): \laissezVibrer  (open-ended tie to the right)
    % (Arrow TextSpanner alternative documented in Notation_Research.md)

    % =================================================================
    % SECTION 6: NOTATION
    % =================================================================
    % Below are sample notation blocks demonstrating each technique.
    % Uncomment the block(s) you need and adjust pitches/dynamics.

    % NOTATION HERE /////////////////////////////////////////////////////

    % -----------------------------------------------------------------
    % EXAMPLE A: CRESCENDO WITH GLISSANDO
    % -----------------------------------------------------------------
    % Two notes with glissando line, hairpin, dynamics, Non-Vib + secco text.
    % This is the most common pattern in the project.

    % Note 1 position
    \once \override NoteColumn.X-offset = \noteColumnOffset1

    % === PITCH 1 ===
    as4

    % --- Glissando line ---
    -\tweak extra-offset #'(0 . 0)       % Y offset: use 0.3 for same-staff-line pitches
    -\tweak bound-details.left.padding #0.4
    -\tweak bound-details.right.padding #-0.1
    \glissando

    % --- Dynamic 1 ---
    -\tweak extra-offset #'(0 . -0.2)
    \ppp

    % --- Hairpin ---
    -\tweak extra-offset #'(-0.8 . 0)
    -\tweak shorten-pair #'(0 . -1.8)   % Adjust right value: negative=longer, positive=shorter
    \<

    % --- Non-Vib Text ---
    -\tweak extra-offset #'(0 . 0)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "Non-Vib"
    }

    % Note 2 position
    \once \override Accidental.extra-offset = #'(0.3 . 0)
    \once \override NoteColumn.X-offset = \noteColumnOffset2

    % === PITCH 2 ===
    a4

    % --- Dynamic 2 ---
    -\tweak extra-offset #'(0.6 . -0.2)
    \f

    % --- Secco Text ---
    -\tweak extra-offset #'(1.9 . 1.4)
    _\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-6
      "secco"
    }

    % Spacer to end hairpin
    s2\!


    % -----------------------------------------------------------------
    % EXAMPLE B: CRESCENDO SINGLE PITCH (commented out)
    % -----------------------------------------------------------------
    % Single half-note with hairpin, dynamics, Non-Vib + secco text.
    % Uncomment to use. Comment out Example A first.
    %
    % \once \override NoteHead.style = #'default
    % \once \override NoteColumn.X-offset = \noteColumnOffset1
    %
    % % === PITCH ===
    % a2
    %
    % % --- Dynamic 1 ---
    % -\tweak extra-offset #'(0 . -0.2)
    % \ppp
    %
    % % --- Hairpin ---
    % -\tweak extra-offset #'(-0.8 . 0)
    % -\tweak shorten-pair #'(0 . 4)     % Shorter right end for single-note layout
    % \<
    %
    % % --- Non-Vib Text ---
    % -\tweak extra-offset #'(0 . 0)
    % ^\markup {
    %   \override #'(font-name . "Crimson Pro Light Italic")
    %   \fontsize #-6
    %   "Non-Vib"
    % }
    %
    % % Spacer
    % s2
    %
    % % --- Dynamic 2 ---
    % -\tweak extra-offset #'(-5.3 . -0.2)
    % \f
    %
    % % --- Secco Text ---
    % -\tweak extra-offset #'(-4.6 . -2.9)
    % _\markup {
    %   \override #'(font-name . "Crimson Pro Light Italic")
    %   \fontsize #-6
    %   "secco"
    % }
    %
    % \!


    % -----------------------------------------------------------------
    % EXAMPLE C: BARTÓK PIZZICATO (commented out)
    % -----------------------------------------------------------------
    % Single short note with snap pizzicato and dynamic.
    % Uncomment to use. Comment out other examples first.
    % Set paper-width=9mm, paper-height=21mm, staffLineWidthMM=1.2
    %
    % \override Stem.transparent = ##f  % Show stem for pizz
    % \once \override NoteColumn.X-offset = #-0.8
    %
    % % === PITCH ===
    % a16\snappizzicato\fff


    % -----------------------------------------------------------------
    % EXAMPLE D: VIBRATO (Wide→Narrow) (commented out)
    % -----------------------------------------------------------------
    % Note with vibrato wavy line, hairpin (decrescendo), dynamics.
    % Uncomment to use. Also uncomment vibrato overrides in Section 5B.
    % Set paper-width=80mm, paper-height=40mm, staffLineWidthMM=2.8
    %
    % % Vibrato overrides (uncomment in Section 5B too):
    % % \override TrillSpanner.bound-details.left.text = ##f
    % % \override TrillSpanner.Y-offset = #3.5
    % % \vibrato #'(3.0 0.0) #1.0 #0.15 #0.65
    %
    % \override Hairpin.height = #0.5
    % \override Hairpin.Y-offset = #-0.9
    %
    % \once \override NoteColumn.X-offset = #-1.4
    %
    % c'2
    % \startTrillSpan
    %
    % -\tweak extra-offset #'(0 . 0.0)
    % -\tweak bound-details.left.padding #0.2
    % -\tweak bound-details.right.padding #-0.1
    % \glissando
    %
    % -\tweak extra-offset #'(0 . 0.3)
    % \fff
    %
    % -\tweak extra-offset #'(-0.5 . 1.2)
    % -\tweak shorten-pair #'(0 . 7)
    % \>
    %
    % s2\stopTrillSpan\!
    %
    % -\tweak extra-offset #'(-5.5 . 3.5)
    % ^\markup {
    %   \override #'(font-name . "Crimson Pro Light Italic")
    %   \fontsize #-9
    %   "Non-Vib"
    % }
    %
    % -\tweak extra-offset #'(-8 . 0.3)
    % \f


    % -----------------------------------------------------------------
    % EXAMPLE E: VIBRATO (Narrow→Wide) (commented out)
    % -----------------------------------------------------------------
    % Same as D but vibrato grows instead of shrinks.
    % Change: vibratoAmplitudes = #'(0.0 3.0)
    % And swap dynamic order (f first, fff at end).
    % Non-Vib text goes at LEFT (start) instead of right (end).
    %
    % See DynamicVibrato-Narrow-Wide_Template.ly for full example.


    % -----------------------------------------------------------------
    % EXAMPLE F: COL LEGNO BATTUTO (commented out)
    % -----------------------------------------------------------------
    % Uses RhythmicStaff with block notehead.
    % This example requires changing \new Staff to \new RhythmicStaff above,
    % so it's documented here as reference only.
    % See Col_Bat_integrated.ly for the full standalone version.
    %
    % Key settings:
    %   \new RhythmicStaff \with {
    %     \override StaffSymbol.line-count = #1
    %     ... (standard omits) ...
    %   }
    %   \blockHead
    %   g4\fff^\markup {
    %     \override #'(font-name . "Crimson Pro Light Italic") \fontsize #-6
    %     \center-column { "c.l. batt." "launch at all strings" }
    %   }


    % -----------------------------------------------------------------
    % EXAMPLE G: HARMONICS WITH CHORD BOX (commented out)
    % -----------------------------------------------------------------
    % Diamond noteheads with partial numbers, enclosed in a rectangle.
    % From Cello_E2_cell.ly.
    %
    % Key settings:
    %   \override NoteHead.style = #'harmonic
    %   \tweak NoteHead.extra-offset #'(X . 0) for horizontal spread
    %
    % Box: \markup \path with moveto/lineto/closepath
    % See Cello_E2_cell.ly lines 79-124 for full chord box implementation.
    %
    % Rectangle edge adjustments:
    %   LEFT edge:   change X in moveto/last lineto
    %   RIGHT edge:  change X in second/third lineto
    %   BOTTOM edge: change Y in moveto/second lineto
    %   TOP edge:    change Y in third/fourth lineto
    %   WHOLE BOX:   change \translate #'(X . Y)


    % -----------------------------------------------------------------
    % EXAMPLE H: PURE GLISSANDO (no hairpin, no cresc) (commented out)
    % -----------------------------------------------------------------
    % Two notes with just a glissando line and dynamic.
    % From GlissandoNotationTemplate.ly.
    % Set paper-width=19mm, paper-height=20mm, staffLineWidthMM=2.4
    %
    % \once \override NoteColumn.X-offset = #-0.7
    % a4\p
    %
    % -\tweak extra-offset #'(0 . 0)      % Y: 0.3 for same-staff-line
    % -\tweak bound-details.left.padding #0.2
    % -\tweak bound-details.right.padding #-0.1
    % \glissando
    %
    % \once \override Accidental.extra-offset = #'(0.3 . 0)
    % \once \override NoteColumn.X-offset = #-1.8
    % af4


    % NOTATION HERE /////////////////////////////////////////////////////

  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
      % ; Proportional notation duration presets (from sf004 + other templates):
      % ;   1/8  — very wide spacing
      % ;   1/16 — wide spacing (sf004 default)
      % ;   1/20 — medium-wide (sf004 commented alternative)
      % ;   1/28 — medium ← CURRENT DEFAULT
      % ;   smaller denominator = more space between notes

      % --- SpacingSpanner options (from sf004, all commented) ---
      % \override SpacingSpanner.uniform-stretching = ##t
      % \override SpacingSpanner.strict-note-spacing = ##t
      % \override SpacingSpanner.strict-grace-spacing = ##t
    }
    indent = -0.9
    line-width = 50\mm
    % #(layout-set-staff-size 20)  % staff height in points (from sf004; default is 20)
  }
  \midi {}
}


% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  APPENDIX: QUICK REFERENCE                                               ║
% ╠════════════════════════════════════════════════════════════════════════════╣
% ║                                                                          ║
% ║  PITCH NOMENCLATURE (English language mode):                             ║
% ║    C4 = c'    C#4 = cs'    Cb4 = cf'    Bb3 = bf                        ║
% ║    C+4 = cqs' (quarter sharp)    Cd4 = cqf' (quarter flat)              ║
% ║    C#+4 = ctqs' (3/4 sharp)      Cbd4 = ctqf' (3/4 flat)               ║
% ║                                                                          ║
% ║  OCTAVE MARKS:                                                           ║
% ║    c (C3), c' (C4), c'' (C5), c''' (C6)                                 ║
% ║    c, (C2), c,, (C1)                                                     ║
% ║                                                                          ║
% ║  DYNAMICS: \ppppp \pppp \ppp \pp \p \mp \mf \f \ff \fff \ffff \fffff    ║
% ║                                                                          ║
% ║  HAIRPINS: \< (crescendo)  \> (decrescendo)  \! (end hairpin)           ║
% ║                                                                          ║
% ║  DURATIONS: 1=whole  2=half  4=quarter  8=eighth  16=sixteenth          ║
% ║                                                                          ║
% ║  CLEFS: \clef treble  \clef alto  \clef bass                            ║
% ║                                                                          ║
% ║  COMMON TWEAKS:                                                          ║
% ║    Move element:    -\tweak extra-offset #'(X . Y)                       ║
% ║    Shorten hairpin: -\tweak shorten-pair #'(left . right)                ║
% ║    Move note:       \once \override NoteColumn.X-offset = #N             ║
% ║    Move accidental: \once \override Accidental.extra-offset = #'(X . Y)  ║
% ║                                                                          ║
% ╚════════════════════════════════════════════════════════════════════════════╝

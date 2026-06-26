Absolutely — **Batch 4 \= MIV shrink hooks**.

This is probably the most important batch conceptually because **MIV is where fake activity gets exposed**.

MIV \= Movement / Interaction Value

Casual-fan version:

Did the player’s movement, screening, cutting, tempo, passing decisions, or off-ball activity actually change the possession?

Not:

Did he look busy?  
Did he run around?  
Did he touch the ball a lot?  
Did he screen someone?

The updated v2.2 doc has MIV routed through the offensive proof profile with role interaction, and MIV has the lowest locked reliability at `.305`, meaning it should be the **heaviest-shrinking component**. The updated doc also locks the pooling cascade, player-level leave-one-out anchors, Henderson III computed `k_level`, and the variance-form posterior.

# **Batch 4 shared MIV shell**

Every MIV hook below uses this structure:

μ\_prior \=  
offensive\_cascade\_prior\_MIV(team\_role × offensive\_role)

priorSD\_base \=  
Henderson/cascade between-cell variance

n\_eff \=  
possessions × esf(team\_role)

SE\_base \=  
σ\_resid\_MIV × sqrt(med\_poss / n\_eff)

SE\_evidence \=  
SE\_base × evidence\_multiplier

μ\_hook \=  
μ\_prior \+ hook\_adjustment

SE\_hook \=  
SE\_evidence × hook\_context\_multiplier

w \=  
priorSD\_hook² / (priorSD\_hook² \+ SE\_hook²)

MIV\_bayesian \=  
w × MIV\_raw  
\+  
(1 − w) × μ\_hook

Because:

r\_MIV \= .305

MIV should usually be skeptical. It needs proof that the movement or interaction actually created value.

---

# **1\. Stationary-Fit Prior**

CSV hook:

stationary-fit prior;  
movement/interaction claims shrink hard without active off-ball proof;  
team role adjusts effective sample

## **Meaning**

This is for stationary spacers, standstill forwards, corner players, or low-movement offensive pieces.

The default assumption:

If your offensive job is mostly standing in a spot, do not claim movement value unless your off-ball positioning actually changes the defense.

## **Signals**

OffBallRelocationValue  
DefenderAttachedRate  
CornerLiftValue  
SpacingShapePreserved  
CutThreatValue  
StationaryShare  
IgnoredRate

## **Math**

ActiveOffBallProof \=  
z(OffBallRelocationValue)  
\+ z(DefenderAttachedRate)  
\+ z(CornerLiftValue)  
\+ z(SpacingShapePreserved)  
\+ z(CutThreatValue)  
− z(IgnoredRate)

StationaryPenalty \=  
z(StationaryShare)  
\+ z(IgnoredRate)

Δμ\_stationary\_fit \=  
β\_active × ActiveOffBallProof  
− β\_stationary × StationaryPenalty

μ\_hook \=  
μ\_prior \+ Δμ\_stationary\_fit

SE\_hook \=  
SE\_evidence × exp(  
  γ\_stationary × StationaryPenalty  
− γ\_active × max(ActiveOffBallProof, 0\)  
)

## **Basketball meaning**

A stationary spacer can have spacing value,  
but he does not get MIV unless his positioning, relocation, or cut threat actually changes the possession.

---

# **2\. Quick-Decision Interaction Prior**

CSV hook:

quick-decision interaction prior;  
reward 0.5 decisions that improve expected value;  
team role adjusts effective sample

## **Meaning**

This is for connectors: players who catch and immediately shoot, swing, drive, touch-pass, or keep the defense rotating.

The core question:

Did his quick decision improve the possession before the defense recovered?

## **Signals**

QuickDecisionRate  
QuickDecisionEVChange  
TouchTimeUnder1sValue  
SecondSideSwingValue  
CloseoutAttackValue  
ResetRate  
BadQuickDecisionRate

## **Math**

QuickDecisionValue \=  
z(QuickDecisionRate)  
\+ z(QuickDecisionEVChange)  
\+ z(TouchTimeUnder1sValue)  
\+ z(SecondSideSwingValue)  
\+ z(CloseoutAttackValue)  
− z(ResetRate)  
− z(BadQuickDecisionRate)

Δμ\_quick\_decision \=  
β\_quick × QuickDecisionValue

μ\_hook \=  
μ\_prior \+ Δμ\_quick\_decision

SE\_hook \=  
SE\_evidence × exp(  
  γ\_bad × z(BadQuickDecisionRate)  
\+ γ\_reset × z(ResetRate)  
− γ\_quick × max(QuickDecisionValue, 0\)  
)

## **Basketball meaning**

The model rewards the player who keeps the advantage alive.  
It shrinks the player who only swings the ball with no pressure or value added.

---

# **3\. Advantage-Conversion Interaction Prior**

CSV hook:

advantage-conversion interaction prior;  
validate value when primary creator sits;  
team role adjusts effective sample

## **Meaning**

This is for secondary creators, connectors, and bench creators who look valuable next to a star.

The question:

Can he convert advantages without the primary creator doing all the work?

## **Signals**

AdvantageConversionValue  
NoPrimaryCreatorMIV  
PrimaryCreatorOverlap  
LineupDiversity  
StarterContextMIV  
AdvantageKilledRate

## **Math**

IndependentConversion \=  
z(AdvantageConversionValue)  
\+ z(NoPrimaryCreatorMIV)  
\+ z(LineupDiversity)  
\+ z(StarterContextMIV)  
− z(AdvantageKilledRate)

CreatorDependency \=  
z(PrimaryCreatorOverlap)

Δμ\_adv\_conversion \=  
β\_independent × IndependentConversion  
− β\_dependency × CreatorDependency

μ\_hook \=  
μ\_prior \+ Δμ\_adv\_conversion

SE\_hook \=  
SE\_evidence × exp(  
  γ\_overlap × CreatorDependency  
\+ γ\_kill × z(AdvantageKilledRate)  
− γ\_independent × max(IndependentConversion, 0\)  
)

## **Basketball meaning**

If his interaction value survives when the star sits, trust it.  
If it only appears beside the star, shrink it toward the role prior.

---

# **4\. Rim-Run / Cut Interaction Prior**

CSV hook:

rim-run/cut interaction prior;  
shrink if movement is entirely creator-fed;  
team role adjusts effective sample

## **Meaning**

This is for cutters, dunker-spot movers, rim runners, transition runners, and lob threats.

The key distinction:

Did his movement create the opening,  
or did someone else create everything and he just finished?

## **Signals**

CutWindowCreated  
RimRunGravity  
TransitionLanePressure  
DunkerSpotRelocationValue  
HelpTagForced  
CreatorFedShare  
EmptyCutRate  
MistimedCutRate

## **Math**

OwnedMovementValue \=  
z(CutWindowCreated)  
\+ z(RimRunGravity)  
\+ z(TransitionLanePressure)  
\+ z(DunkerSpotRelocationValue)  
\+ z(HelpTagForced)  
− z(EmptyCutRate)  
− z(MistimedCutRate)

CreatorFedDependency \=  
z(CreatorFedShare)

Δμ\_rimrun\_cut \=  
β\_owned × OwnedMovementValue  
− β\_fed × CreatorFedDependency

μ\_hook \=  
μ\_prior \+ Δμ\_rimrun\_cut

SE\_hook \=  
SE\_evidence × exp(  
  γ\_fed × CreatorFedDependency  
\+ γ\_empty × z(EmptyCutRate)  
− γ\_owned × max(OwnedMovementValue, 0\)  
)

## **Basketball meaning**

A great cutter deserves MIV because his movement bends the defense.  
A pure recipient of star-created dunks gets shrunk.

---

# **5\. Self-Created Movement / Interaction Prior**

CSV hook:

self-created movement/interaction prior;  
penalize empty dribble or low-quality possession control;  
team role adjusts effective sample

## **Meaning**

This is for on-ball movement: probing, rejecting screens, relocating with the dribble, manipulating defenders, changing pace.

The danger:

A player can dribble a lot and create nothing.

## **Signals**

SelfCreatedAdvantageValue  
PaceChangeValue  
RejectScreenValue  
DriveManipulationValue  
HelpForcedRate  
EmptyDribbleRate  
LowQualityControlRate  
LiveBallTOVRate

## **Math**

SelfCreatedInteraction \=  
z(SelfCreatedAdvantageValue)  
\+ z(PaceChangeValue)  
\+ z(RejectScreenValue)  
\+ z(DriveManipulationValue)  
\+ z(HelpForcedRate)  
− z(EmptyDribbleRate)  
− z(LowQualityControlRate)  
− z(LiveBallTOVRate)

Δμ\_self\_interaction \=  
β\_self × SelfCreatedInteraction

μ\_hook \=  
μ\_prior \+ Δμ\_self\_interaction

SE\_hook \=  
SE\_evidence × exp(  
  γ\_emptydribble × z(EmptyDribbleRate)  
\+ γ\_lowquality × z(LowQualityControlRate)  
\+ γ\_tov × z(LiveBallTOVRate)  
− γ\_self × max(SelfCreatedInteraction, 0\)  
)

## **Basketball meaning**

The model rewards manipulation.  
It penalizes empty dribbling.

---

# **6\. Screen Interaction Prior**

CSV hook:

screen interaction prior;  
shrink if handler/shooter gravity creates most value;  
team role adjusts effective sample

## **Meaning**

This is for screeners. The player can create interaction value by setting screens, flipping angles, slipping, rescreening, ghosting, or forcing two defenders to react.

But some screen value is really the handler’s gravity.

## **Signals**

ScreenContactQuality  
ScreenAssistValue  
RescreenValue  
GhostScreenValue  
SlipTimingValue  
TwoDefenderEngagement  
HandlerGravityShare  
ShooterGravityShare  
IllegalScreenRate

## **Math**

ScreenerOwnedValue \=  
z(ScreenContactQuality)  
\+ z(ScreenAssistValue)  
\+ z(RescreenValue)  
\+ z(GhostScreenValue)  
\+ z(SlipTimingValue)  
\+ z(TwoDefenderEngagement)  
− z(IllegalScreenRate)

GravityDependency \=  
z(HandlerGravityShare)  
\+ z(ShooterGravityShare)

Δμ\_screen \=  
β\_screen × ScreenerOwnedValue  
− β\_gravitydep × GravityDependency

μ\_hook \=  
μ\_prior \+ Δμ\_screen

SE\_hook \=  
SE\_evidence × exp(  
  γ\_gravitydep × GravityDependency  
\+ γ\_illegal × z(IllegalScreenRate)  
− γ\_screen × max(ScreenerOwnedValue, 0\)  
)

## **Basketball meaning**

A real screener creates contact, confusion, switches, and openings.  
A screen next to Steph-level gravity should not automatically give the screener full MIV.

---

# **7\. Downhill Interaction Prior**

CSV hook:

downhill interaction prior;  
value must force rotations/free throws/dump-offs;  
team role adjusts effective sample

## **Meaning**

This overlaps with COV paint-touch, but MIV cares more about the **interaction chain** created by the drive.

The question:

Did the downhill action force the defense to rotate and create linked decisions?

## **Signals**

PaintTouchRate  
HelpRotationForced  
LowManCommitRate  
DumpOffCreation  
KickoutChainValue  
FoulPressure  
EmptyPaintTouchRate  
DriveTOVRate

## **Math**

DownhillInteraction \=  
z(HelpRotationForced)  
\+ z(LowManCommitRate)  
\+ z(DumpOffCreation)  
\+ z(KickoutChainValue)  
\+ z(FoulPressure)  
− z(EmptyPaintTouchRate)  
− z(DriveTOVRate)

Δμ\_downhill \=  
β\_downhill × DownhillInteraction

μ\_hook \=  
μ\_prior \+ Δμ\_downhill

SE\_hook \=  
SE\_evidence × exp(  
  γ\_empty × z(EmptyPaintTouchRate)  
\+ γ\_tov × z(DriveTOVRate)  
− γ\_rotation × max(DownhillInteraction, 0\)  
)

## **Basketball meaning**

A drive matters if it starts a chain reaction.  
If it is just a paint touch with no rotation, shrink it.

---

# **8\. Late-Clock Interaction Prior**

CSV hook:

late-clock interaction prior;  
shrink if bailout attempts do not improve expected value;  
team role adjusts effective sample

## **Meaning**

This is for late-clock actions: bailouts, broken plays, emergency creation, late-clock cuts, and rescue passes.

The distinction:

Did he rescue a dead possession,  
or did he just take a bad late-clock shot?

## **Signals**

TrueGrenadeReceivedRate  
LateClockEVImprovement  
LateClockPassValue  
LateClockShotQuality  
SelfCreatedMessRate  
LateClockTOVRate  
BadBailoutAttemptRate

## **Math**

LateClockInteraction \=  
z(TrueGrenadeReceivedRate)  
\+ z(LateClockEVImprovement)  
\+ z(LateClockPassValue)  
\+ z(LateClockShotQuality)  
− z(SelfCreatedMessRate)  
− z(LateClockTOVRate)  
− z(BadBailoutAttemptRate)

Δμ\_lateclock\_MIV \=  
β\_late × LateClockInteraction

μ\_hook \=  
μ\_prior \+ Δμ\_lateclock\_MIV

SE\_hook \=  
SE\_evidence × exp(  
  γ\_bad × z(BadBailoutAttemptRate)  
\+ γ\_mess × z(SelfCreatedMessRate)  
\+ γ\_tov × z(LateClockTOVRate)  
− γ\_rescue × max(LateClockInteraction, 0\)  
)

## **Basketball meaning**

True rescue interaction gets protected.  
Late-clock nonsense shrinks hard.

---

# **9\. Hub Interaction Prior**

CSV hook:

hub interaction prior;  
credit handoff/elbow flow only if it improves half-court offense;  
team role adjusts effective sample

## **Meaning**

This is for elbow hubs, post hubs, DHO hubs, and connective bigs/forwards.

The question:

Do his handoffs, elbow touches, and connective actions actually make the half-court offense better?

## **Signals**

ElbowTouchValue  
DHOFlowValue  
HandoffShotQuality  
PostSplitValue  
HubPassChainValue  
HalfcourtORtgAfterHubTouch  
HubTOVRate  
PostStallRate

## **Math**

HubInteraction \=  
z(ElbowTouchValue)  
\+ z(DHOFlowValue)  
\+ z(HandoffShotQuality)  
\+ z(PostSplitValue)  
\+ z(HubPassChainValue)  
\+ z(HalfcourtORtgAfterHubTouch)  
− z(HubTOVRate)  
− z(PostStallRate)

Δμ\_hub\_MIV \=  
β\_hub × HubInteraction

μ\_hook \=  
μ\_prior \+ Δμ\_hub\_MIV

SE\_hook \=  
SE\_evidence × exp(  
  γ\_tov × z(HubTOVRate)  
\+ γ\_stall × z(PostStallRate)  
− γ\_flow × max(HubInteraction, 0\)  
)

## **Basketball meaning**

Hub touches only count if they improve flow.  
Empty elbow touches and stalled post touches shrink.

---

# **10\. Movement Value Prior**

CSV hook:

movement value prior;  
shrink only if movement does not change teammate shot quality;  
team role adjusts effective sample

## **Meaning**

This is the pure movement version. It is for players whose cuts, relocations, sprint-outs, corner lifts, and off-ball actions move defenders.

The key question:

Did his movement improve teammate shot quality?

## **Signals**

MovementFrequency  
TeammateShotQualityAfterMovement  
DefenderDisplacement  
HelpShiftCreated  
CutGravity  
RelocationValue  
EmptyMovementRate

## **Math**

UsefulMovement \=  
z(TeammateShotQualityAfterMovement)  
\+ z(DefenderDisplacement)  
\+ z(HelpShiftCreated)  
\+ z(CutGravity)  
\+ z(RelocationValue)  
− z(EmptyMovementRate)

Δμ\_movement \=  
β\_movement × UsefulMovement

μ\_hook \=  
μ\_prior \+ Δμ\_movement

SE\_hook \=  
SE\_evidence × exp(  
  γ\_empty × z(EmptyMovementRate)  
− γ\_useful × max(UsefulMovement, 0\)  
)

## **Basketball meaning**

Movement only matters if it changes defender positioning or teammate shot quality.

---

# **11\. Tempo / Control Prior**

CSV hook:

tempo/control prior;  
shrink ball-control that does not improve team shot quality;  
team role adjusts effective sample

## **Meaning**

This is for guards and hubs who control pace, organize transition, slow things down, speed things up, or manage possession quality.

The danger:

Control can look like value even when it just delays the offense.

## **Signals**

PaceControlValue  
EarlyOffenseCreated  
TransitionDecisionValue  
TeamShotQualityAfterControl  
BadTempoRate  
OverdribbleRate  
LateClockCreatedRate

## **Math**

TempoControlValue \=  
z(PaceControlValue)  
\+ z(EarlyOffenseCreated)  
\+ z(TransitionDecisionValue)  
\+ z(TeamShotQualityAfterControl)  
− z(BadTempoRate)  
− z(OverdribbleRate)  
− z(LateClockCreatedRate)

Δμ\_tempo \=  
β\_tempo × TempoControlValue

μ\_hook \=  
μ\_prior \+ Δμ\_tempo

SE\_hook \=  
SE\_evidence × exp(  
  γ\_badtempo × z(BadTempoRate)  
\+ γ\_overdribble × z(OverdribbleRate)  
− γ\_control × max(TempoControlValue, 0\)  
)

## **Basketball meaning**

Good pace control creates better shots.  
Bad ball control just makes possessions later and worse.

---

# **12\. Useful Movement Share Prior**

CSV hook:

useful movement share prior;  
shrink empty movement that does not bend defenders;  
team role adjusts effective sample

## **Meaning**

This is basically the purest version of MIV. It separates:

useful movement

from:

cardio

## **Signals**

UsefulMovementShare  
DefenderBendRate  
AdvantageCreatedByMovement  
TeammateShotQualityLift  
EmptyMovementShare  
MovementWithoutDefensiveReaction

## **Math**

UsefulMovementShareScore \=  
z(UsefulMovementShare)  
\+ z(DefenderBendRate)  
\+ z(AdvantageCreatedByMovement)  
\+ z(TeammateShotQualityLift)  
− z(EmptyMovementShare)  
− z(MovementWithoutDefensiveReaction)

Δμ\_useful\_movement \=  
β\_useful × UsefulMovementShareScore

μ\_hook \=  
μ\_prior \+ Δμ\_useful\_movement

SE\_hook \=  
SE\_evidence × exp(  
  γ\_empty × z(EmptyMovementShare)  
\+ γ\_no\_reaction × z(MovementWithoutDefensiveReaction)  
− γ\_useful × max(UsefulMovementShareScore, 0\)  
)

## **Basketball meaning**

Running around is not value.  
Bending defenders is value.

---

# **Role-specific MIV interpretation**

This is where the new canonical vocabulary really matters.

| Role | MIV interpretation |
| ----- | ----- |
| **FC** | Movement/interaction must scale a real offense; empty control gets punished. |
| **HM** | Starter-level movement must survive full-strength lineups. |
| **RS** | Narrow trusted starter: give credit inside lane, but do not inflate into creator value. |
| **TS** | Conditional starter: shrink if interaction value is matchup-specific. |
| **6M** | Bench engine: needs proof interaction value survives starter/closing contexts. |
| **CR** | Stable rotation: credit clean quick decisions, shrink star-dependent value. |
| **SS** | Veteran specialist: interaction value must match the specialist lane. |
| **EN** | Energy player: activity must become expected-value change. |
| **DEV** | Young inflated reps: heavy SE inflation unless signal clearly bends defense. |
| **GT** | Low-leverage movement mostly ignored for real MIV. |
| **DNP/INA** | No court-value grade. |

This is especially important for MIV because **Developmental** and **Energy** players can look extremely active. v2.2 should not confuse activity with impact.

# **Batch 4 implementation fields**

For MIV, I’d store these hook-level fields:

player\_id  
season  
component \= MIV  
hook\_family

team\_role  
offensive\_role  
availability  
esf  
evidence\_state  
evidence\_multiplier

L1\_key  
L2\_key  
L3\_key  
L4\_key  
L5\_key  
lambda\_L1  
lambda\_L2  
lambda\_L3  
lambda\_L4

prior\_mean\_cascade  
priorSD\_base  
priorSD\_hook

MIV\_raw  
possessions  
n\_eff

interaction\_signal\_positive\_1  
interaction\_signal\_positive\_2  
interaction\_signal\_positive\_3  
interaction\_signal\_negative\_1  
interaction\_signal\_negative\_2

mu\_hook  
context\_multiplier  
SE\_base  
SE\_hook

posterior\_weight  
MIV\_bayesian  
shrinkage\_reason\_flags  
calibration\_flag

# **Batch 4 bottom line**

MIV is the anti-fake-activity component.

It should reward:

quick decisions  
useful movement  
screen value  
defender displacement  
advantage preservation  
hub flow  
rim-run/cut gravity  
tempo control that improves shot quality

It should shrink:

empty movement  
empty dribbling  
star-fed cuts  
handler-created screen value  
bench-only interaction value  
late-clock nonsense  
cardio without defensive reaction  
developmental inflated reps

The clean public-facing explanation:

Gingeball does not give points for looking active.  
It gives points for movement and interaction that actually change what the defense has to do.

Batch 5 should be **DSV \+ DPC**, where we move to defense: assignment difficulty, protected roles, gambling, pressure, containment, and whether defensive events actually help the shell.


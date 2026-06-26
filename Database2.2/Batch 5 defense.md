Absolutely — **Batch 5 \= DSV \+ DPC**.

This is where we separate:

real defense

from:

box-score defense, gambling, protected roles, easy assignments, and teammate-driven defensive rating

The v2.2 doc routes **DSV** through the defensive proof profile plus team role, and **DPC** through the defensive proof profile. So these are defensive-side shrinks: they use the player’s **team role × defensive role** cell, then the same Bayesian posterior formula.

# **Batch 5 shared defensive shell**

For every DSV/DPC hook:

μ\_prior \=  
defensive\_cascade\_prior(component, team\_role × defensive\_role)

priorSD\_base \=  
Henderson/cascade between-cell variance

n\_eff \=  
possessions × esf(team\_role)

SE\_base \=  
σ\_resid\_component × sqrt(med\_poss / n\_eff)

SE\_evidence \=  
SE\_base × evidence\_multiplier

μ\_hook \=  
μ\_prior \+ hook\_adjustment

SE\_hook \=  
SE\_evidence × hook\_context\_multiplier

w \=  
priorSD\_hook² / (priorSD\_hook² \+ SE\_hook²)

bayesian\_component \=  
w × raw\_component  
\+  
(1 − w) × μ\_hook

Component reliability:

DSV r \= .807  
DPC r \= .501

Meaning:

DSV is relatively stable and should not be crushed if the role/context proof is modeled.  
DPC is much noisier and needs heavier shrinkage because steals, blocks, deflections, and pressure can be fake-impact or scheme-created.

The existing shrinkage notes already had defensive shrinkage concepts like role-position DPC, top-offense validation, and lineup-dependency shrinkage; v2.2 upgrades those into proof-profile/cascade logic instead of old family buckets.

---

# **Part 1 — DSV shrink hooks**

## **What DSV means**

DSV \= Defensive Stability / Defensive Value

Plain English:

Does this player actually make the defense better in the role he is asked to play?

Not:

Did his opponent miss shots?  
Did he get blocks?  
Did the lineup have a good defensive rating?  
Did he guard easy matchups?

DSV should reward actual defensive responsibility:

containment  
assignment difficulty  
screen navigation  
rim protection  
shell discipline  
rotational correctness  
matchup suppression  
lineup defensive survival

and shrink fake defensive value from:

easy assignments  
protected roaming  
opponent shooting luck  
elite teammate cover  
foul trouble  
scheme hiding  
no-center / with-center distortion

---

## **1\. Assignment-difficulty shrink**

CSV hook family:

easy-assignment shrinkage;  
assignment difficulty adjusts trust

## **Meaning**

A player who guards the weakest offensive player should not get the same DSV credit as a player taking primary matchups.

## **Signals**

PrimaryAssignmentDifficulty  
StarAssignmentShare  
OnBallUsageFaced  
SelfCreatedShotCreatorFaced  
ScreenActionsDefended  
EasyAssignmentShare  
HiddenDefenderShare

## **Math**

AssignmentBurden \=  
z(PrimaryAssignmentDifficulty)  
\+ z(StarAssignmentShare)  
\+ z(OnBallUsageFaced)  
\+ z(SelfCreatedShotCreatorFaced)  
\+ z(ScreenActionsDefended)  
− z(EasyAssignmentShare)  
− z(HiddenDefenderShare)

Δμ\_assignment \=  
β\_assignment × AssignmentBurden

μ\_hook \=  
μ\_prior \+ Δμ\_assignment

SE\_hook \=  
SE\_evidence × exp(  
  γ\_easy × z(EasyAssignmentShare)  
\+ γ\_hidden × z(HiddenDefenderShare)  
− γ\_burden × max(AssignmentBurden, 0\)  
)

## **Basketball meaning**

If you guard real threats and survive, DSV gets trusted.  
If the scheme hides you, your raw DSV shrinks.

---

## **2\. Matchup-suppression prior**

CSV hook family:

matchup suppression prior;  
opponent shot quality and usage suppression matter more than raw FG%

## **Meaning**

This separates real defense from opponent misses.

## **Signals**

ExpectedShotQualityAllowed  
ActualShotValueAllowed  
UsageSuppression  
PaintTouchSuppression  
DriveDeterrence  
IsolationSuppression  
OpponentShotLuck

## **Math**

ProcessSuppression \=  
− z(ExpectedShotQualityAllowed)  
\+ z(UsageSuppression)  
\+ z(PaintTouchSuppression)  
\+ z(DriveDeterrence)  
\+ z(IsolationSuppression)

LuckAdjustedSuppression \=  
ProcessSuppression  
− z(OpponentShotLuck)

Δμ\_matchup \=  
β\_process × LuckAdjustedSuppression

μ\_hook \=  
μ\_prior \+ Δμ\_matchup

SE\_hook \=  
SE\_evidence × exp(  
  γ\_luck × z(OpponentShotLuck)  
− γ\_process × max(ProcessSuppression, 0\)  
)

## **Basketball meaning**

Making opponents take worse shots is real.  
Opponents randomly missing decent shots is not.

---

## **3\. Protected-roamer shrink**

CSV hook family:

protected-roamer shrinkage;  
credit help defense, shrink if protected by anchor or easy assignment

## **Meaning**

Roamers can be extremely valuable. But some look great because another defender handles the hard matchup or protects the rim behind them.

## **Signals**

HelpEventValue  
LowManRotationValue  
NailHelpValue  
StuntRecoverValue  
ProtectedByAnchorShare  
EasyAssignmentShare  
MissedRotationRate  
CloseoutRecoveryRate

## **Math**

RoamerOwnedValue \=  
z(HelpEventValue)  
\+ z(LowManRotationValue)  
\+ z(NailHelpValue)  
\+ z(StuntRecoverValue)  
\+ z(CloseoutRecoveryRate)  
− z(MissedRotationRate)

ProtectionDependency \=  
z(ProtectedByAnchorShare)  
\+ z(EasyAssignmentShare)

Δμ\_roamer \=  
β\_roam × RoamerOwnedValue  
− β\_protect × ProtectionDependency

μ\_hook \=  
μ\_prior \+ Δμ\_roamer

SE\_hook \=  
SE\_evidence × exp(  
  γ\_protect × ProtectionDependency  
\+ γ\_missed × z(MissedRotationRate)  
− γ\_roam × max(RoamerOwnedValue, 0\)  
)

## **Basketball meaning**

Roaming gets credit when it creates real help value.  
It shrinks when the player is just freelancing from a protected assignment.

---

## **4\. POA containment prior**

CSV hook family:

point-of-attack containment prior;  
credit screen navigation and drive containment, not just steals

## **Meaning**

POA defense is about staying attached, getting over screens, containing drives, and not breaking the shell.

## **Signals**

ScreenNavigationValue  
DriveContainmentRate  
BlowByAllowedRate  
RearViewContestValue  
PickUpPointPressure  
FoulRateOnBall  
HelpRequiredBehind

## **Math**

POAContainment \=  
z(ScreenNavigationValue)  
\+ z(DriveContainmentRate)  
\+ z(RearViewContestValue)  
\+ z(PickUpPointPressure)  
− z(BlowByAllowedRate)  
− z(FoulRateOnBall)  
− z(HelpRequiredBehind)

Δμ\_poa \=  
β\_poa × POAContainment

μ\_hook \=  
μ\_prior \+ Δμ\_poa

SE\_hook \=  
SE\_evidence × exp(  
  γ\_blowby × z(BlowByAllowedRate)  
\+ γ\_foul × z(FoulRateOnBall)  
\+ γ\_help × z(HelpRequiredBehind)  
− γ\_contain × max(POAContainment, 0\)  
)

## **Basketball meaning**

A good POA defender prevents rotations from starting.  
Steals are secondary.

---

## **5\. Screen-navigation prior**

CSV hook family:

screen-navigation shrink;  
separate real navigation from switch/coverage protection

## **Meaning**

A guard who fights over screens should get different credit than a guard who is constantly switched out of hard actions or protected by drop coverage.

## **Signals**

OverScreenRate  
UnderScreenPunishAllowed  
ScreenContactSurvival  
NavigationRecoveryTime  
SwitchOutShare  
DropCoverageProtection  
TrailingContestValue

## **Math**

ScreenNavProof \=  
z(OverScreenRate)  
\+ z(ScreenContactSurvival)  
\+ z(TrailingContestValue)  
− z(UnderScreenPunishAllowed)  
− z(NavigationRecoveryTime)

CoverageProtection \=  
z(SwitchOutShare)  
\+ z(DropCoverageProtection)

Δμ\_screen\_nav \=  
β\_nav × ScreenNavProof  
− β\_protect × CoverageProtection

SE\_hook \=  
SE\_evidence × exp(  
  γ\_protect × CoverageProtection  
− γ\_nav × max(ScreenNavProof, 0\)  
)

## **Basketball meaning**

The model gives credit for actually navigating screens, not for being hidden from them.

---

## **6\. Rim-protection / backline anchor prior**

CSV hook family:

backline anchor prior;  
separate deterrence, contests, fouls, and scheme cover

## **Meaning**

Big defensive value is not just blocks. A rim protector can erase shots by making players not attempt them.

## **Signals**

RimDeterrence  
RimContestValue  
OpponentRimFrequencyAllowed  
BlockValue  
VerticalityValue  
FoulBurden  
SchemeCoverShare  
PerimeterLeakBurden

## **Math**

RimProtectionOwned \=  
z(RimDeterrence)  
\+ z(RimContestValue)  
− z(OpponentRimFrequencyAllowed)  
\+ z(BlockValue)  
\+ z(VerticalityValue)  
− z(FoulBurden)

ContextBurden \=  
z(PerimeterLeakBurden)  
− z(SchemeCoverShare)

Δμ\_rim\_anchor \=  
β\_rim × RimProtectionOwned  
\+ β\_burden × ContextBurden

SE\_hook \=  
SE\_evidence × exp(  
  γ\_foul × z(FoulBurden)  
− γ\_deterrence × max(z(RimDeterrence), 0\)  
)

## **Basketball meaning**

Blocks matter, but deterrence and verticality matter more.  
If he cleans up terrible perimeter defense, protect him.  
If scheme hides him, shrink.

---

## **7\. Low-man / rotation helper prior**

CSV hook family:

low-man helper prior;  
credit correct rotations, shrink late or fake help

## **Meaning**

This captures defensive IQ: tagging rollers, rotating early, helping without overhelping, then recovering.

## **Signals**

LowManTagValue  
RollerTagTiming  
HelpThenRecoverValue  
CornerStayDiscipline  
OverhelpRate  
LateRotationRate  
XOutExecutionValue

## **Math**

LowManValue \=  
z(LowManTagValue)  
\+ z(RollerTagTiming)  
\+ z(HelpThenRecoverValue)  
\+ z(CornerStayDiscipline)  
\+ z(XOutExecutionValue)  
− z(OverhelpRate)  
− z(LateRotationRate)

Δμ\_lowman \=  
β\_lowman × LowManValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_late × z(LateRotationRate)  
\+ γ\_overhelp × z(OverhelpRate)  
− γ\_lowman × max(LowManValue, 0\)  
)

## **Basketball meaning**

Good help defense is early, correct, and recoverable.  
Late panic help shrinks.

---

## **8\. Foul-burden shrink**

CSV hook family:

foul burden shrinkage;  
defensive value shrinks if it cannot stay on court

## **Meaning**

A defender can be high-impact but volatile if he fouls too much. This should not erase the defensive value, but it should lower trust/portability.

## **Signals**

ShootingFoulRate  
ReachFoulRate  
ScreenFoulRate  
LooseBallFoulRate  
FoulTroubleMinutesLost  
DefensiveAggressionValue

## **Math**

FoulBurden \=  
z(ShootingFoulRate)  
\+ z(ReachFoulRate)  
\+ z(ScreenFoulRate)  
\+ z(LooseBallFoulRate)  
\+ z(FoulTroubleMinutesLost)

AggressiveValue \=  
z(DefensiveAggressionValue)

Δμ\_foul \=  
β\_aggressive × AggressiveValue  
− β\_foul × FoulBurden

SE\_hook \=  
SE\_evidence × exp(  
  γ\_foul × FoulBurden  
)

## **Basketball meaning**

Aggression counts.  
But if the aggression constantly turns into fouls, the value shrinks.

---

## **9\. No-center / with-center split**

CSV hook family:

no-center split;  
shrink or protect defensive value based on whether it survives without backline cover

## **Meaning**

This matters for wings, roamers, and guards whose defensive value may depend on having a real rim protector behind them.

## **Signals**

DSV\_with\_true\_center  
DSV\_without\_true\_center  
RimProtectionBehindShare  
DefensiveRoleChangeNoCenter  
SmallBallSurvival

## **Math**

NoCenterDelta \=  
DSV\_without\_true\_center − DSV\_with\_true\_center

Bayesian split:

NoCenterDelta\_post \=  
w\_delta × NoCenterDelta\_raw  
\+  
(1 − w\_delta) × NoCenterDelta\_prior\_for\_defensive\_role

Then:

Δμ\_no\_center \=  
β\_no\_center × z(NoCenterDelta\_post)

μ\_hook \=  
μ\_prior \+ Δμ\_no\_center

SE\_hook \=  
SE\_evidence × exp(  
  γ\_cover × z(RimProtectionBehindShare)  
− γ\_survive × max(z(SmallBallSurvival), 0\)  
)

## **Basketball meaning**

If his defense survives without a center, trust it more.  
If it collapses without backline cover, shrink.

---

## **10\. Top-offense validation**

CSV hook family:

top-offense validation;  
defensive value must survive elite offensive opponents

## **Signals**

DSV\_vs\_top10\_offenses  
DSV\_vs\_top5\_halfcourt\_offenses  
HighLeverageDSV  
PlayoffOrPlayInDSV  
RegularSeasonDSV

## **Math**

CompetitionValidatedDSV \=  
0.50 × z(RegularSeasonDSV)  
\+ 0.25 × z(DSV\_vs\_top10\_offenses)  
\+ 0.15 × z(HighLeverageDSV)  
\+ 0.10 × z(PlayoffOrPlayInDSV)

Δμ\_competition \=  
β\_comp × CompetitionValidatedDSV

SE\_hook \=  
SE\_evidence × exp(  
  \- γ\_comp × max(CompetitionValidatedDSV, 0\)  
)

## **Basketball meaning**

Defense that only works against bad offenses shrinks.  
Defense that survives elite offenses earns trust.

---

# **Part 2 — DPC shrink hooks**

## **What DPC means**

DPC \= Defensive Pressure / Containment / Disruption

Plain English:

Does the player create useful defensive pressure or disruption without damaging the team shell?

DPC is where box-score defense lies constantly.

It should reward:

deflections  
ball pressure  
steals  
blocks  
charges  
stunts  
digging  
recoveries  
rim events  
passing-lane disruption

but shrink:

gambling  
fouling  
overhelping  
blown rotations  
chasing steals  
block-hunting  
event stats created by scheme  
pressure that lets the defense collapse

Because DPC reliability is only `.501`, it should be meaningfully more skeptical than DSV.

---

## **1\. Event-without-shell-damage prior**

CSV hook family:

event defense prior;  
credit events only if shell survives

## **Signals**

Deflections  
Steals  
Blocks  
Charges  
EventValue  
BlownRotationAfterGamble  
TeamShellBreakRate  
RecoveryAfterEventAttempt  
FoulAfterPressureRate

## **Math**

UsefulEvents \=  
z(Deflections)  
\+ z(Steals)  
\+ z(Blocks)  
\+ z(Charges)  
\+ z(EventValue)  
\+ z(RecoveryAfterEventAttempt)

ShellDamage \=  
z(BlownRotationAfterGamble)  
\+ z(TeamShellBreakRate)  
\+ z(FoulAfterPressureRate)

Δμ\_events \=  
β\_events × UsefulEvents  
− β\_shell × ShellDamage

μ\_hook \=  
μ\_prior \+ Δμ\_events

SE\_hook \=  
SE\_evidence × exp(  
  γ\_shell × ShellDamage  
− γ\_events × max(UsefulEvents, 0\)  
)

## **Basketball meaning**

Steals and blocks only count fully if they do not wreck the defense.

---

## **2\. Gambling shrink**

CSV hook family:

gambling shrinkage;  
penalize failed pressure and missed rotations

## **Signals**

StealAttemptRate  
FailedGambleRate  
BackdoorAllowedRate  
RotationVacatedRate  
AdvantageAllowedAfterGamble  
SuccessfulGambleValue

## **Math**

GambleValue \=  
z(SuccessfulGambleValue)  
− z(FailedGambleRate)  
− z(BackdoorAllowedRate)  
− z(RotationVacatedRate)  
− z(AdvantageAllowedAfterGamble)

Δμ\_gamble \=  
β\_gamble × GambleValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_failed × z(FailedGambleRate)  
\+ γ\_vacated × z(RotationVacatedRate)  
− γ\_success × max(z(SuccessfulGambleValue), 0\)  
)

## **Basketball meaning**

A gambler who creates turnovers and recovers gets credit.  
A gambler who sells the shell shrinks hard.

---

## **3\. POA pressure prior**

CSV hook family:

POA pressure prior;  
pressure must reduce advantage, not just harass

## **Signals**

PickupDistance  
BallPressureRate  
TurnDirectionForced  
AdvanceDelayValue  
ScreenDenialValue  
BlowByAllowedRate  
FoulRatePressure  
HelpTriggeredBehind

## **Math**

POAPressureValue \=  
z(PickupDistance)  
\+ z(BallPressureRate)  
\+ z(TurnDirectionForced)  
\+ z(AdvanceDelayValue)  
\+ z(ScreenDenialValue)  
− z(BlowByAllowedRate)  
− z(FoulRatePressure)  
− z(HelpTriggeredBehind)

Δμ\_poa\_pressure \=  
β\_pressure × POAPressureValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_blowby × z(BlowByAllowedRate)  
\+ γ\_foul × z(FoulRatePressure)  
− γ\_pressure × max(POAPressureValue, 0\)  
)

## **Basketball meaning**

Pressure matters when it delays or disrupts offense.  
If pressure just creates blow-bys, shrink it.

---

## **4\. Wing disruption prior**

CSV hook family:

wing disruptor prior;  
credit digs, stunts, rotations, and passing-lane pressure

## **Signals**

DigValue  
StuntValue  
PassingLanePressure  
CloseoutDisruption  
NailHelpDisruption  
RecoveryValue  
OverhelpRate  
CornerLeakRate

## **Math**

WingDisruption \=  
z(DigValue)  
\+ z(StuntValue)  
\+ z(PassingLanePressure)  
\+ z(CloseoutDisruption)  
\+ z(NailHelpDisruption)  
\+ z(RecoveryValue)  
− z(OverhelpRate)  
− z(CornerLeakRate)

Δμ\_wing\_disrupt \=  
β\_wing × WingDisruption

SE\_hook \=  
SE\_evidence × exp(  
  γ\_overhelp × z(OverhelpRate)  
\+ γ\_leak × z(CornerLeakRate)  
− γ\_wing × max(WingDisruption, 0\)  
)

## **Basketball meaning**

Good wing disruption bends the possession and still recovers.  
Bad disruption leaks corners.

---

## **5\. Backline event prior**

CSV hook family:

big disruptor / backline event prior;  
blocks and contests must not create fouls or rebounding leaks

## **Signals**

BlockValue  
RimContestEventValue  
VerticalityEvents  
ChargeValue  
GoaltendRate  
FoulAfterContestRate  
OREBAllowedAfterContest  
BlockChaseMissedPosition

## **Math**

BacklineEvents \=  
z(BlockValue)  
\+ z(RimContestEventValue)  
\+ z(VerticalityEvents)  
\+ z(ChargeValue)  
− z(GoaltendRate)  
− z(FoulAfterContestRate)  
− z(OREBAllowedAfterContest)  
− z(BlockChaseMissedPosition)

Δμ\_backline\_event \=  
β\_backline × BacklineEvents

SE\_hook \=  
SE\_evidence × exp(  
  γ\_foul × z(FoulAfterContestRate)  
\+ γ\_oreb × z(OREBAllowedAfterContest)  
− γ\_block × max(z(BlockValue), 0\)  
)

## **Basketball meaning**

Blocks matter less if they create fouls, goaltends, or rebounding leaks.

---

## **6\. Deflection quality prior**

CSV hook family:

deflection quality prior;  
separate live-ball disruption from harmless tips

## **Signals**

LiveBallDeflections  
DeflectionsLeadingToTurnover  
DeflectionsLeadingToReset  
DeflectionsLeadingToBadShot  
HarmlessDeflectionRate  
OutOfPositionAfterDeflection

## **Math**

DeflectionQuality \=  
z(DeflectionsLeadingToTurnover)  
\+ z(DeflectionsLeadingToReset)  
\+ z(DeflectionsLeadingToBadShot)  
− z(HarmlessDeflectionRate)  
− z(OutOfPositionAfterDeflection)

Δμ\_deflection \=  
β\_deflect × DeflectionQuality

SE\_hook \=  
SE\_evidence × exp(  
  γ\_harmless × z(HarmlessDeflectionRate)  
\+ γ\_position × z(OutOfPositionAfterDeflection)  
− γ\_quality × max(DeflectionQuality, 0\)  
)

## **Basketball meaning**

A deflection that resets the offense or creates a turnover is valuable.  
A meaningless tip is not.

---

## **7\. Charge / physical disruption prior**

CSV hook family:

charge / physicality prior;  
credit legal disruption, shrink foul-heavy physicality

## **Signals**

ChargesDrawn  
VerticalityWins  
LegalContactStops  
ScreenNavigationPhysicality  
BlockingFouls  
ReachFouls  
LooseBallFouls

## **Math**

LegalPhysicality \=  
z(ChargesDrawn)  
\+ z(VerticalityWins)  
\+ z(LegalContactStops)  
\+ z(ScreenNavigationPhysicality)  
− z(BlockingFouls)  
− z(ReachFouls)  
− z(LooseBallFouls)

Δμ\_physical \=  
β\_physical × LegalPhysicality

SE\_hook \=  
SE\_evidence × exp(  
  γ\_foul × (z(BlockingFouls) \+ z(ReachFouls) \+ z(LooseBallFouls))  
− γ\_legal × max(LegalPhysicality, 0\)  
)

## **Basketball meaning**

Physical disruption is good when it is legal and repeatable.  
Foul-heavy physicality shrinks.

---

## **8\. Role-position disruption prior**

CSV hook family from old shrinkage notes:

role-position shrinkage;  
separate POA defender, wing disruptor, big disruptor

## **Meaning**

DPC cannot use one generic disruption prior. A guard’s pressure, a wing’s digs, and a big’s rim events are different defensive jobs.

## **Prior cells**

POA defender → pressure/containment DPC prior  
Wing stopper/roamer → stunt/dig/recovery DPC prior  
Backline anchor → rim-event/verticality DPC prior  
Event defender → disruption-heavy DPC prior

## **Math**

μ\_prior \=  
defensive\_cascade\_prior\_DPC(team\_role × defensive\_role)

Then the hook selects role-specific signals:

DPC\_role\_value \=  
Σ β\_j × z(role\_relevant\_disruption\_signal\_j)  
− Σ γ\_k × z(role\_relevant\_damage\_signal\_k)

μ\_hook \=  
μ\_prior \+ DPC\_role\_value

## **Basketball meaning**

A guard gets DPC credit differently than a rim protector.  
Same stat family, different defensive job.

---

## **9\. Top-offense DPC validation**

CSV hook family:

top-offense validation;  
pressure/disruption must survive elite spacing and creators

The older shrinkage notes had this shape:

DPC\_prior \=  
0.50 × role\_baseline  
\+ 0.30 × DPC\_vs\_top\_offenses  
\+ 0.20 × high\_leverage\_DPC

Updated v2.2 version:

CompetitionDPC \=  
0.50 × z(RegularSeasonDPC)  
\+ 0.30 × z(DPC\_vs\_top10\_offenses)  
\+ 0.20 × z(HighLeverageDPC)

Δμ\_top\_offense\_DPC \=  
β\_top × CompetitionDPC

SE\_hook \=  
SE\_evidence × exp(  
  \- γ\_top × max(CompetitionDPC, 0\)  
)

## **Basketball meaning**

Pressure against bad teams is not the same as pressure against elite spacing.

---

## **10\. Lineup-dependency DPC shrink**

CSV hook family:

lineup dependency shrinkage;  
disruption must survive without elite defenders covering mistakes

The older notes framed this as:

DPC\_prior \=  
role\_baseline  
\+ β × DPC\_without\_elite\_defenders  
− γ × teammate\_defense\_overlap

Updated v2.2:

IndependentDPC \=  
z(DPC\_without\_elite\_defenders)  
\+ z(LineupDiversity)  
\+ z(DPC\_without\_anchor)  
− z(TeammateDefenseOverlap)  
− z(EliteDefenderCoverShare)

Δμ\_lineup\_DPC \=  
β\_independent × IndependentDPC

SE\_hook \=  
SE\_evidence × exp(  
  γ\_overlap × z(TeammateDefenseOverlap)  
\+ γ\_cover × z(EliteDefenderCoverShare)  
− γ\_independent × max(IndependentDPC, 0\)  
)

## **Basketball meaning**

A chaos defender gets trusted if the defense survives without elite teammates covering him.  
If the disruption only works because others clean up the mess, it shrinks.

---

# **Role-specific defensive interpretation**

The canonical Role on Team vocabulary still matters, but defense has an extra layer: **defensive role** matters even more than box score.

| Role on Team | DSV/DPC interpretation |
| ----- | ----- |
| **FC** | High responsibility; defensive value must match role, but offensive load may explain lower assignment burden. |
| **HM** | Starter-level defense should survive real lineups and real assignments. |
| **RS** | Narrow trusted starter: reward in-lane defensive job, do not overclaim versatility. |
| **TS** | Matchup/fit starter: shrink if defense is opponent-specific. |
| **6M** | Bench impact: defensive events need starter/closing validation. |
| **CR** | Stable rotation: trust role-consistent defense, shrink star/anchor dependency. |
| **SS** | Veteran specialist: credit narrow defensive skill, shrink broad-value claims. |
| **EN** | Energy defender: pressure must not become fouls/gambling/shell damage. |
| **DEV** | Young defender: heavy SE inflation; flashes need shrinkage until role stabilizes. |
| **GT** | Low-leverage defensive sample mostly ignored. |
| **DNP/INA** | No court-value grade. |

# **DSV vs DPC difference**

This distinction matters a lot:

| Component | What it asks | Common fake signal |
| ----- | ----- | ----- |
| **DSV** | “Did he make the defense better and survive his assignment?” | Easy matchup, opponent shooting luck, protected role |
| **DPC** | “Did his pressure/disruption help without breaking the shell?” | Gambling, blocks/steals without structure, fouling |

Short version:

DSV \= defensive reliability and suppression.  
DPC \= defensive events and pressure.

Example:

Player A: low steals, always contains the ball, no blow-bys.  
High DSV, maybe modest DPC.

Player B: tons of steals, constantly gives up rotations.  
High raw DPC, but shrunk DPC and maybe weaker DSV.

Player C: elite roamer next to a dominant rim protector.  
Good raw DSV/DPC, but protected-roamer and teammate-overlap hooks decide how much he owns.

# **Batch 5 implementation fields**

For DSV/DPC rows, store:

player\_id  
season  
component \= DSV or DPC  
hook\_family

team\_role  
defensive\_role  
availability  
esf  
evidence\_state  
evidence\_multiplier

L1\_key \= season × team\_role × defensive\_role  
L2\_key \= team\_role × defensive\_role  
L3\_key \= leverage\_tier × defensive\_role  
L4\_key \= defensive\_role  
L5\_key \= global\_component

lambda\_L1  
lambda\_L2  
lambda\_L3  
lambda\_L4

prior\_mean\_cascade  
priorSD\_base  
priorSD\_hook

raw\_component\_value  
possessions  
n\_eff

assignment\_difficulty  
teammate\_defense\_overlap  
opponent\_luck\_adjustment  
foul\_burden  
shell\_damage  
top\_offense\_validation  
lineup\_independence

mu\_hook  
context\_multiplier  
SE\_base  
SE\_hook  
posterior\_weight  
bayesian\_component\_value  
shrinkage\_reason\_flags  
calibration\_flag

# **Batch 5 bottom line**

DSV protects real defensive reliability from being lost in box-score noise.  
DPC prevents defensive-event merchants from getting fake impact credit.

The public-facing version:

Gingeball does not just count steals, blocks, or opponent misses.  
It asks whether the defender handled a real job, whether the defense stayed organized,  
and whether the value survived without teammates hiding the hard parts.

Batch 6 should be **RPV \+ IIB \+ PTV**, which is the lineup/context/portability batch: rebounding and possession completion, lineup impact, star overlap, no-center splits, role portability, and whether value travels.


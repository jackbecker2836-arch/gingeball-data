Yes — this update changes Batch 1 in one major way:

We should NOT use a hard “cell if k \>= 5, fallback if not” rule anymore.

The corrected v2.2 version is:  
soft empirical-Bayes pooling cascade  
\+ player-level leave-one-out anchors  
\+ Henderson III computed k\_level  
\+ per-label esf  
\+ evidence SE inflation  
\+ floors/checks as safety rails.

The updated MD locks that the player-season profile is `{team role, offensive role, defensive role}`, that offensive components like COV use the **team role × offensive role** proof-profile cell, and that the final posterior still uses `bayesian = w·observed + (1-w)·prior_mean` with `w = priorSD² / (priorSD² + SE²)`.

# **Redone Batch 1 — COV Paint-Touch Creation Shrink**

CSV hook:

paint-touch creation prior;  
protect bad-spacing rim pressure,  
penalize empty paint touches;  
team role: bench/rotation context;  
shrink bench-only, star-overlap, and matchup-specialist production toward role prior

Updated v2.2 hook name:

COV — Paint-Touch Creation Shrink

Plain-English meaning:

A player gets COV credit for getting into the paint only if that paint pressure actually bends the defense.

If he creates paint advantage in bad spacing, protect him.  
If he gets paint touches that lead nowhere, shrink him.  
If the value is bench-only, star-overlapped, or matchup-picked, trust the raw number less.

This is mostly for:

Rim Pressure Driver  
Secondary Creator  
Primary Offensive Engine  
Advantage Connector  
late-clock downhill guards/wings  
paint-touch bench creators

# **1\. Parameter types first**

This is important because the updated MD is very clear that some things are **starting values**, some are **computed**, and some are just **checks**.

| Item | Type | Use |
| ----- | ----- | ----- |
| `esf` by Role on Team | starting-value | Scales possessions into effective sample size. |
| `evidence_state → SE multiplier` | starting-value | Inflates uncertainty if signal is proxy/scaffolded. |
| `k_level` | computed | Comes from Henderson III variance components. Do **not** hand-set. |
| `priorSD floor` | starting-value guard | Prevents freakishly tight priors. |
| `SE floor` | starting-value guard | Prevents huge samples from forcing certainty. |
| `w ≈ r at median possessions` | check-not-knob | Calibration sanity check. |
| `β / γ hook coefficients` | starting-value pending calibration | Later tuned from pbp/lineup/shot context data. |

So the old “k around 5” idea should now be reframed as:

We want lower effective pooling than old k=20,  
but k\_level itself is computed by Henderson III.

Expected behavior:  
n≈2  → λ≈0.10–0.20  
n≈30 → λ≈0.60–0.80  
n≈100 → λ≈0.90+

That means tiny cells do not get ignored, but they also do not get trusted raw.

# **2\. Role-on-Team esf**

Role on Team sets **trust in the sample**, not skill.

n\_eff \= esf(team\_role) × possessions

Starting values / ranges:

| Code | Role | esf |
| ----- | ----- | ----- |
| FC | Franchise Cornerstone | 1.00 |
| HM | Heavy-Minute Starter | 1.00 |
| RS | Role Starter | 0.90–0.95 |
| 6M | Sixth Man / Impact Sub | 0.82–0.88 |
| CR | Core Rotational | 0.78–0.82 |
| TS | Tactical Starter | 0.70–0.78 |
| SS | Situational Specialist | 0.60–0.68 |
| EN | Energy / Spark Plug | 0.50–0.58 |
| DEV | Developmental | 0.40–0.48 |
| GT | Garbage Time | 0.25–0.35 |
| DNP/INA | No court-value grade | n/a |

Sanity rule:

Each step down should matter.  
If two adjacent labels end up within \~0.03, they are not doing separate work.  
FC/HM vs DEV should be roughly a 2:1 trust spread.

# **3\. Evidence-state SE multiplier**

This multiplies standard error:

SE\_evidence \= SE\_base × evidence\_multiplier

Starting values:

| Evidence state | Multiplier |
| ----- | ----- |
| modeled | 1.00 |
| signal\_proxy | 1.15–1.35 |
| scaffolded\_missing | 1.50–2.00 |

Important compound warning:

DEV \+ scaffolded\_missing is already a massive shrink.

Example:  
DEV esf ≈ 0.45  
scaffolded\_missing SE multiplier ≈ 2.0

That is a very hard trust discount, so do not also add a giant role penalty inside the hook.

# **4\. Prior is no longer raw cell mean**

Old version:

If enough rows in cell:  
    prior\_mean \= AVG(cell)  
    priorSD \= STDDEV(cell)  
else:  
    fallback

New v2.2 version:

Use a recursive empirical-Bayes pooling cascade.

The updated MD locks the cascade:

L5 global component  
L4 court role pooled  
L3 leverage tier × court role  
L2 cross-season team role × court role  
L1 per-season team role × court role × season  
obs player-season

Each level shrinks toward its parent:

est(level) \=  
λ\_level × raw\_mean(level)  
\+  
(1 − λ\_level) × est(parent)

λ\_level \=  
n\_level / (n\_level \+ k\_level)

And `k_level` is computed:

k\_level \=  
σ²\_within / σ²\_between

The MD also locks that player-level leave-one-out applies to the anchors at every level, while `priorSD²` comes from per-level between-cell variance instead of the SD inside one thin cell. That is what fixes both the anchor leak and the spread leak.

# **5\. Player-level leave-one-out**

For player `p`, season `s`, component COV:

Exclude every season of player p from L1-L4 anchor means.

Not just the current season.

So:

raw\_mean\_L1\_LOO \=  
AVG(COV\_raw\_j)  
for all rows in same season × team\_role × offensive\_role  
where player\_id\_j \!= player\_id\_i

Same for L2, L3, and L4.

Why exclude all of the player’s seasons?

Because a player’s seasons are correlated.  
If we only exclude the current season, his other seasons still pull the prior toward himself.

# **6\. Prior anchor for this hook**

For this hook:

component \= COV  
offensive\_role \= Rim Pressure Driver  
team\_role \= player’s canonical team role  
season \= player season

Example player:

2023-24  
team\_role \= CR  
offensive\_role \= Rim Pressure Driver

Cascade levels:

L5 \= all COV player-seasons

L4 \= all Rim Pressure Driver COV player-seasons

L3 \= Bench × Rim Pressure Driver COV player-seasons

L2 \= Core Rotational × Rim Pressure Driver COV player-seasons across seasons

L1 \= 2023-24 × Core Rotational × Rim Pressure Driver COV player-seasons

Then:

μ\_L5 \= global COV mean

μ\_L4 \= λ4 × raw\_mean\_L4\_LOO \+ (1 − λ4) × μ\_L5

μ\_L3 \= λ3 × raw\_mean\_L3\_LOO \+ (1 − λ3) × μ\_L4

μ\_L2 \= λ2 × raw\_mean\_L2\_LOO \+ (1 − λ2) × μ\_L3

μ\_L1 \= λ1 × raw\_mean\_L1\_LOO \+ (1 − λ1) × μ\_L2

Final unhooked prior:

μ\_prior \= μ\_L1

Meaning:

The prior is not “just players in this tiny cell.”  
It is the best pooled estimate of what this exact role/job/season group should produce,  
borrowing strength from broader groups only as much as needed.

# **7\. PriorSD from variance components**

Do **not** use:

priorSD \= STDDEV(thin cell)

That reintroduces the spread leak.

Use the Henderson/cascade variance components:

priorSD² \= pooled between-cell variance from the cascade level mix

A practical implementation:

π1 \= λ1  
π2 \= (1 − λ1) × λ2  
π3 \= (1 − λ1) × (1 − λ2) × λ3  
π4 \= (1 − λ1) × (1 − λ2) × (1 − λ3) × λ4  
π5 \= (1 − λ1) × (1 − λ2) × (1 − λ3) × (1 − λ4)

priorSD\_base² \=  
π1 × σ²\_between\_L1  
\+ π2 × σ²\_between\_L2  
\+ π3 × σ²\_between\_L3  
\+ π4 × σ²\_between\_L4  
\+ π5 × σ²\_between\_L5

Then apply the floor:

priorSD\_floor \= 0.05–0.10 × globalSD\_COV

priorSD\_base \=  
max(sqrt(priorSD\_base²), priorSD\_floor)

This means:

A tiny weird cell cannot pretend it is super tight.  
A player cannot create his own spread and escape shrinkage.

# **8\. Residual SE**

Base SE:

SE\_base \=  
σ\_resid\_COV × sqrt(med\_poss / n\_eff)

Where:

n\_eff \= possessions × esf(team\_role)

`σ_resid_COV` should come from the pooled/component residual variance system, not one thin cell.

For COV:

r\_COV \= 0.765

Calibration check:

At median possessions,  
modeled evidence,  
neutral context,  
SE and priorSD should produce w ≈ 0.765 ± 0.10.

Then:

SE\_evidence \=  
SE\_base × evidence\_multiplier

Apply SE floor:

SE\_floor \= 0.05 × globalSD\_COV

SE\_evidence \=  
max(SE\_evidence, SE\_floor)

# **9\. Paint-touch hook signals**

Use z-scores or percentiles relative to role/cell distribution, not raw values.

Core signals:

| Signal | Meaning |
| ----- | ----- |
| `PTA` | Paint-touch advantage value: how much the possession improves after he touches paint. |
| `BSP` | Bad-spacing pressure: did he create advantage despite cramped spacing? |
| `EPT` | Empty paint-touch rate: paint touches that create no rotation, shot, foul, kickout, or rim pressure. |
| `PT_TOV` | Turnover/bad-reset rate after paint touches. |
| `ESO` | Excess star overlap: production next to stronger creators above role expectation. |
| `EBO` | Excess bench-only context: production that appears mostly against bench/soft units above role expectation. |
| `EMS` | Excess matchup-specialist context: production in favorable/selected matchups above role expectation. |

The word **excess** matters.

Do not punish a sixth man merely because he plays bench minutes. Only penalize if his production is unusually bench-only **relative to sixth-man expectations**.

EBO \=  
max(0, bench\_context\_share\_i − expected\_bench\_context\_share\_for\_team\_role)

Same idea:

ESO \=  
max(0, star\_overlap\_i − expected\_star\_overlap\_for\_team\_role\_and\_role)

EMS \=  
max(0, matchup\_specialist\_rate\_i − expected\_matchup\_specialist\_rate\_for\_role)

This avoids double-counting role, because role already hits `esf`.

# **10\. Hook-adjusted prior mean**

Define:

HardPaintCreation \=  
max(0, PTA) × max(0, BSP)

This is the protection term.

It means:

Bad spacing only protects the player if he actually creates advantage through it.  
Bad spacing by itself is not an excuse.

Hooked prior:

μ\_hook \=  
μ\_prior  
\+ β\_adv × PTA  
\+ β\_badspace × HardPaintCreation  
− β\_empty × EPT  
− β\_tov × PT\_TOV

Starting β shape, in COV units after standardized inputs:

β\_adv       \= 0.25–0.40 × globalSD\_COV  
β\_badspace  \= 0.15–0.30 × globalSD\_COV  
β\_empty     \= 0.25–0.45 × globalSD\_COV  
β\_tov       \= 0.20–0.35 × globalSD\_COV

These are **starting values pending calibration**, not computed Henderson quantities.

Interpretation:

PTA high → raise prior  
bad-spacing creation high → raise/protect prior  
empty paint touches high → lower prior  
paint-touch turnovers high → lower prior

# **11\. Hook-adjusted uncertainty**

Context dependence should mostly hit **SE**, not directly subtract value.

M\_context \=  
exp(  
  γ\_star × ESO  
\+ γ\_bench × EBO  
\+ γ\_matchup × EMS  
− γ\_hard × HardPaintCreation  
)

Starting γ shape:

γ\_star    \= 0.08–0.16  
γ\_bench   \= 0.08–0.14  
γ\_matchup \= 0.08–0.14  
γ\_hard    \= 0.06–0.12

Then:

SE\_hook \=  
SE\_evidence × M\_context

Interpretation:

Excess star overlap → less trust in raw COV  
Excess bench-only context → less trust in raw COV  
Excess matchup-specialist production → less trust in raw COV  
Hard paint creation in bad spacing → more trust

Again: this is not “bench player bad.” It is:

If the paint-touch creation has only appeared in easier contexts,  
we require more proof before believing it.

# **12\. Optional priorSD hook**

Keep this mild. Since v2.2 now estimates priorSD through variance components, do not over-hand-edit it.

M\_priorSD \=  
exp(  
  δ\_hard × HardPaintCreation  
− δ\_dep × DependencyRisk  
− δ\_empty × EPT  
)

Where:

DependencyRisk \=  
0.40 × ESO  
\+ 0.35 × EBO  
\+ 0.25 × EMS

Starting values:

δ\_hard  \= 0.04–0.08  
δ\_dep   \= 0.04–0.08  
δ\_empty \= 0.03–0.06

Then:

priorSD\_hook \=  
priorSD\_base × M\_priorSD

But I’d mark this as **secondary**. The cleaner first build is:

Hook modifies prior mean \+ SE.  
priorSD mostly comes from Henderson/cascade.

# **13\. Final posterior**

w \=  
priorSD\_hook² / (priorSD\_hook² \+ SE\_hook²)

COV\_bayesian \=  
w × COV\_raw  
\+  
(1 − w) × μ\_hook

That is the final Batch 1 math.

# **14\. Worked example using the corrected system**

Player-season:

team\_role \= CR  
offensive\_role \= Rim Pressure Driver  
component \= COV  
COV\_raw \= \+2.40  
possessions \= 1800  
esf\_CR \= 0.80  
evidence\_state \= modeled  
availability \= full

Effective sample:

n\_eff \=  
1800 × 0.80  
\= 1440

Cascade prior, after player-level LOO:

μ\_prior \= \+0.72

Important: this `+0.72` is **not** raw CR × Rim Pressure Driver mean. It is the telescoped estimate:

2023-24 CR × Rim Pressure Driver  
→ cross-season CR × Rim Pressure Driver  
→ Bench × Rim Pressure Driver  
→ Rim Pressure Driver  
→ global COV

Assume Henderson/cascade spread:

priorSD\_base \= 1.10  
globalSD\_COV \= 2.60  
priorSD\_floor \= 0.08 × 2.60 \= 0.208

priorSD\_base clears floor.

Assume residual setup:

σ\_resid\_COV \= 0.95  
med\_poss \= 3592

Base SE:

SE\_base \=  
0.95 × sqrt(3592 / 1440\)

SE\_base \=  
0.95 × 1.579

SE\_base \=  
1.50

Evidence:

modeled \= 1.00

SE\_evidence \= 1.50

Hook signals:

PTA \= \+0.80  
BSP \= \+0.70  
EPT \= \+0.25  
PT\_TOV \= \+0.20

ESO \= \+0.45  
EBO \= \+0.35  
EMS \= \+0.25

Hard paint creation:

HardPaintCreation \=  
max(0, 0.80) × max(0, 0.70)  
\= 0.56

Use example β values:

β\_adv \= 0.35  
β\_badspace \= 0.22  
β\_empty \= 0.35  
β\_tov \= 0.25

Hooked prior:

μ\_hook \=  
0.72  
\+ 0.35(0.80)  
\+ 0.22(0.56)  
− 0.35(0.25)  
− 0.25(0.20)

μ\_hook \=  
0.72  
\+ 0.280  
\+ 0.123  
− 0.088  
− 0.050

μ\_hook \=  
\+0.985

Context multiplier, using:

γ\_star \= 0.12  
γ\_bench \= 0.10  
γ\_matchup \= 0.10  
γ\_hard \= 0.08

M\_context \=  
exp(  
0.12(0.45)  
\+ 0.10(0.35)  
\+ 0.10(0.25)  
− 0.08(0.56)  
)

M\_context \=  
exp(0.054 \+ 0.035 \+ 0.025 − 0.045)

M\_context \=  
exp(0.069)

M\_context \=  
1.071

Final SE:

SE\_hook \=  
1.50 × 1.071  
\= 1.61

Mild priorSD hook, optional:

DependencyRisk \=  
0.40(0.45) \+ 0.35(0.35) \+ 0.25(0.25)

DependencyRisk \=  
0.180 \+ 0.123 \+ 0.063  
\= 0.366

Using:

δ\_hard \= 0.05  
δ\_dep \= 0.05  
δ\_empty \= 0.04

M\_priorSD \=  
exp(  
0.05(0.56)  
− 0.05(0.366)  
− 0.04(0.25)  
)

M\_priorSD \=  
exp(0.028 − 0.018 − 0.010)

M\_priorSD \=  
exp(0.000)

M\_priorSD ≈ 1.00

So:

priorSD\_hook \= 1.10

Posterior weight:

w \=  
1.10² / (1.10² \+ 1.61²)

w \=  
1.21 / (1.21 \+ 2.59)

w \=  
0.318

Final:

COV\_bayesian \=  
0.318(2.40)  
\+  
0.682(0.985)

COV\_bayesian \=  
0.763  
\+  
0.672

COV\_bayesian \=  
\+1.435

# **15\. Basketball interpretation**

Raw COV:

\+2.40

Bayesian COV:

\+1.44

Translation:

The player is creating real paint pressure.  
He gets protected because some of that pressure comes in bad spacing.  
But the model does not fully buy the \+2.40 because the production is still star-overlapped, bench-leaning, and matchup-shaped.  
So the final number says: real positive creation, but not yet fully starter-proof or engine-proof creation.

That is exactly the behavior Gingeball should have.

# **16\. Role-specific meaning under canonical vocab**

The old hook phrase said:

team role: bench/rotation context

That is now too vague.

Updated per-role interpretation:

| Role | Paint-touch COV interpretation |
| ----- | ----- |
| **FC** | Paint pressure must validate the whole offense. Empty control gets punished. |
| **HM** | Paint pressure must survive real starter matchups. |
| **RS** | Full-time narrow starter: trust the lane, but do not upgrade him into an engine. |
| **TS** | Conditional starter: shrink if paint pressure is matchup-picked. |
| **6M** | Bench engine: value needs bench-to-starter validation. |
| **CR** | Stable rotation piece: shrink if paint pressure only works next to one star/lineup. |
| **SS** | Veteran narrow specialist: shrink if rim pressure is just a matchup trick. |
| **EN** | Activity player: paint touches must become value, not just chaos. |
| **DEV** | Young inflated-rep player: heavy SE inflation unless the advantage signal is obvious. |
| **GT** | Low-leverage sample: mostly do not trust for real COV. |
| **DNP/INA** | No court-value grade. |

# **17\. Final Batch 1 implementation row**

For each player-season/component row, store:

player\_id  
season  
component \= COV  
hook\_family \= paint\_touch\_creation

team\_role  
availability  
esf  
offensive\_role

L1\_key \= season × team\_role × offensive\_role  
L2\_key \= team\_role × offensive\_role  
L3\_key \= leverage\_tier × offensive\_role  
L4\_key \= offensive\_role  
L5\_key \= global\_COV

lambda\_L1  
lambda\_L2  
lambda\_L3  
lambda\_L4

prior\_mean\_global  
prior\_mean\_court\_role  
prior\_mean\_tier\_role  
prior\_mean\_cross\_season\_cell  
prior\_mean\_per\_season\_cell  
prior\_mean\_cascade

priorSD\_base  
priorSD\_floor  
priorSD\_hook

COV\_raw  
possessions  
n\_eff

evidence\_state  
evidence\_multiplier

PTA  
BSP  
HardPaintCreation  
EPT  
PT\_TOV  
ESO  
EBO  
EMS

mu\_hook  
M\_context  
SE\_base  
SE\_hook  
SE\_floor  
posterior\_weight  
COV\_bayesian  
calibration\_flag

# **18\. Final locked Batch 1 rule**

COV Paint-Touch Creation Shrink \=  
Use the offensive proof-profile cascade to create a role-aware prior.  
Use player-level leave-one-out on all anchor means.  
Use Henderson III computed k\_level values, not hand-set k.  
Use between-cell variance for priorSD, not thin-cell SD.  
Use team-role esf to scale effective possessions.  
Use evidence\_state to inflate SE.  
Use the paint-touch hook to adjust prior mean and uncertainty.  
Apply the variance-form Bayesian posterior.  
Check w≈r\_COV at median possessions.

That is the clean version.

It keeps the basketball logic:

paint pressure matters  
bad-spacing rim pressure deserves protection  
empty paint touches should not fool the model  
bench/star/matchup context should reduce trust

while also respecting the updated math architecture:

no hard k=5 fallback  
no self-shrinkage leak  
no thin-cell spread leak  
no double-counting role and evidence  
computed k\_level, not guessed k


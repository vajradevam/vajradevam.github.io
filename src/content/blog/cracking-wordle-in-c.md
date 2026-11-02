---
title: Cracking Wordle in C
pubDate: 2026-11-02
description: Reproducing the proven-optimal Wordle policy in C, and then finding out that the published answer list no longer matches the game.
tags:
  - c
  - technical
  - algorithms
---

Wordle is a solved game, in the strict sense: somebody has computed the globally optimal
policy and proved that it's optimal. So writing a solver should be a weekend of
transcription, and that's what I expected going in.

It mostly was. The part I didn't expect was that the hardest problem had nothing to do
with the search.

## What was already solved

Dimitris Bertsimas and Alex Paskov published *An Exact Solution to Wordle* in
*Operations Research* (73(3):1384-1394, 2025). They model the game as a Markov decision
process, write down the Bellman equation, and solve it by exact dynamic programming. The
result is that `SALET` is the optimal opening word, the optimal policy averages
3.4212 guesses, and it never needs more than five. Alex Selby reached the same answer
independently by exhaustive search in January 2022.

I should be clear that this is the part of my program that works best, and none of it is
mine. The recurrence my solver computes is their Bellman equation. On the canonical lists
(2315 answers plus 10657 extra legal guesses, 12972 total) my C version returns 7920 total
guesses, 3.4212 average, worst case 5. That isn't an improvement on the paper. It's the
ceiling the paper proved, and matching it exactly is the best available outcome.

I take `salet` on faith too. Deriving the opener needs a full-width search
over all 12972 possible first guesses, which is hours of compute, not milliseconds. Every
guess after the first one is searched for real at runtime.

## Encoding the game as bytes

A Wordle clue is five trits (grey 0, yellow 1, green 2), so there are 3^5 = 243 possible
colourings and all of them fit in a byte. Pack it base-3 and the game becomes integer
arithmetic:

```c
/* colour of `answer` when you guess `guess`, one byte; 242 == all green */
uint8_t PAT [NGUESS][NANS];    /* 12972 x  2315  =  30 MB */
uint8_t PATW[NGUESS][NGUESS];  /* 12972 x 12972  = 168 MB */
```

Both tables get built once across threads and then mmap'd from a cache directory, keyed
by an FNV hash of the word list, so changing the words rebuilds them automatically. After
that, scoring a guess against a candidate is a single array load. Nothing in the hot path
touches a string.

Filtering is just as crude. When you tell the solver `ybbbg`, that parses to a
byte, and it keeps the candidates whose table entry equals that byte. There's no per-letter
constraint bookkeeping anywhere, and the duplicate-letter cases come out right for free,
because the table was built with the real rule: a green claims the answer's copy of a letter
first, and only leftover copies can turn a later repeat yellow. So `geese` against
`these` is `bbggg`, not `ygggg`. A lot of solvers get this
wrong, and precomputing it means you can only get it wrong once.

The search is the Bellman recurrence with the usual load-bearing tricks. A
`2n-1` lower bound on any candidate set, since you pay one guess per candidate
plus a second for all but the one you might luckily name this turn. Alpha/beta-style budget
propagation across sibling buckets. A Zobrist-hashed transposition table over candidate
sets. A beam over a cheap one-ply ranking, wide enough that from turn two onward the result
is the true optimum.

It worked, it matched the paper, and I thought I was done.

## The game it got wrong

I played a real puzzle through it. It opened `salet`, I fed it colours, it
narrowed down to one candidate and guessed `wrist`. I entered `bgggg`,
meaning the first letter was wrong and the rest were correct, and it said:

> those colours rule out every word, they can't all be right.

I had entered everything correctly. The answer was `grist`. My solver was
telling me a true thing was impossible, with complete confidence, because
`grist` wasn't in its answer list.

That's the whole project in one error message. The 2315-word list was accurate for Wordle
as it existed when the list was scraped, and then the New York Times bought the game and
started editing the answers. The proof is still a proof. It's just a proof about a slightly
different game than the one on my screen.

The failure mode is what bothers me. A solver that treats "not in my list" as
"impossible" doesn't degrade gracefully when the list drifts. It becomes confidently wrong,
and it sounds exactly as sure of itself as it did when it was right.

## A prior instead of a list

The fix is to stop pretending I know the answer set. Rather than a binary
possible/impossible, every word carries a prior weight, and the objective becomes

```
minimize  sum over words of  weight(word) x guesses-to-find-it
```

where `--prior P` is P(the answer is on the official list) and derives the
weight ratio between list words and the other 10657. At `--prior 1` the extras
weigh nothing and you recover the paper's problem exactly, which is useful: it means every
later change can be checked against a certified number. At the default of 0.95 the extras
stay alive as candidates, just cheap. Nothing legal is ever pruned, so the contradiction I
hit can't happen at all, rather than merely being unlikely.

That created a second problem, which turned out to be more interesting than the first.

## Pricing a loss

With all 12972 words alive, some positions genuinely can't be won in the turns remaining.
My search reported those as `INF`, infeasible. That's true and completely
useless, because once a value is infinite every losing line looks exactly as bad as every
other losing line. The search couldn't tell them apart, so it threw away the whole six-guess
budget and started losing games it could have won.

So I stopped calling it infeasible and charged for it instead. A candidate you fail to
pin down costs `LOSS = 16` guess-equivalents per unit of weight. Now the search
can see that one disaster is worse than another, and it does what I wanted without being
told: it sacrifices improbable words to keep likely ones inside six guesses. It chooses
which games to lose.

I tried `LOSS` at 48 and at 128. Both were worse. Too large a penalty and the
lower bound stops pruning effectively, so the search gets slower and plays worse at the same
time. 16 is what I settled on. At `--prior 1` nothing is ever over budget, so the
term never fires and the certified result is untouched.

Something smaller fell out of the same thinking. On the last allowed turn, a clever
splitting guess wins with probability zero, so however bad the position is you should name
the likeliest remaining candidate and take the chance. My solver had been playing the
splitter. That was free wins I'd been giving away by not noticing an obvious thing.

## What it costs

|  | answer list: avg | worst | all 12972: avg | unsolved |
|---|---|---|---|---|
| `--prior 1` (the paper) | 3.4212 | 5 | 4.3585 | 117 (0.90%) |
| `--prior 0.95` (default) | 3.4233 | 5 | 4.2696 | 37 (0.29%) |
| flat prior | 3.7819 | 6 | 4.0660 | 1 (0.01%) |

The default gives up 0.0021 guesses of average performance on the official list, keeps
the never-more-than-five guarantee, and cuts failures on arbitrary English words by two
thirds. Stated plainly: my default is worse than the paper on the paper's own metric, and
better on an axis the paper doesn't measure. That's a reasonable trade when the answer list
is a moving target, and a bad one if you trust the list.

None of this is novel. 3Blue1Brown weighted words by frequency years ago, just paired
with an entropy heuristic rather than exact DP, and replacing a hard constraint with a
penalty is a first-week trick. I'd assume the combination has been written up somewhere I
haven't read.

## The bug Python found

This is the part I'd most want someone else to take away.

In hard mode, where every guess has to be consistent with all the clues so far, the
solver reported that `vaunt` took seven guesses. It walks
`daunt`, `gaunt`, `haunt`, `jaunt` one at a time
instead of playing a splitter that separates them in a single move. I looked at that,
reasoned about the constraints, concluded the position was genuinely unwinnable, and said so
out loud with some confidence.

Then I wrote an independent brute force in Python, from scratch, sharing no code with the
C version, and it found a six-guess line.

Two real bugs, both of which had been there the entire time:

- The per-guess evaluator passed its children the parent's legal-guess pool in hard mode
  instead of narrowing it. So it valued every guess as though later turns were unconstrained,
  which rates losing lines as winning ones. `vaunt` went from 7 to 4 once I fixed
  it.
- The transposition table keyed only on the candidate set. In hard mode the legal-guess
  pool is part of the position, because the same set of surviving candidates reached through
  different clue histories has a different optimal value once your future guesses are
  constrained. That one looked harmless right up until I started writing those values to
  disk.

Both were invisible at `--prior 1`. My headline benchmark, the one that
matched a certified published result to four decimal places, exercised neither of them. I
had the most reassuring evidence of correctness available and two live bugs sitting behind
it.

I also had to retract a number I'd already stated. I measured hard mode in an
intermediate state, with one bug fixed and the other still there, decided the previously
documented figure had been an artifact, and announced the new one as the honest value. The
original was right. Reproducing a published optimum tells you one configuration is correct
and nothing at all about the others, and I'd been treating it as a character reference for
the whole program.

Write the second implementation. Not a second test, a second implementation, in a
different language, ideally without reference to how you did it the first time. It's the
only thing that caught this.

## Where it still loses

Thirty-seven words out of 12972 still go unsolved, and the list is embarrassing:
`fixed` and `fazed` sit in it next to `fuffy`,
`poovy` and `zills`. The reason is that my prior is uniform across all
10657 non-list words, so the solver can't tell `fixed` from `fuffy`,
and when it decides which games to sacrifice it's spending the budget blind.

I tried to fix this with a plausibility model built from letter and bigram statistics
over the answer list, and then threw it out. It put `fixed` in the 4.7th
percentile, because `x` is rare and an ordinary word ends up looking like noise,
and `crore` in the 99.8th. It measures orthographic typicality, which isn't the
same thing as being a word people use, and shipping it would have made the exact failure
worse.

The real fix is word-frequency data, which means a new external dependency with
licensing questions attached, so it isn't in there. The cheap fix is one line: drop today's
answer list into `data/answers.txt` and rebuild. The cache keys hash the word
list, so everything downstream regenerates itself.

## Closing

Between the persistent book of solved positions and the mmap'd tables, a full game went
from 11 seconds to 56 milliseconds. That felt like the point of the project while I was
chasing it, and it wasn't.

The search was the easy half, and it was easy because someone had already proved what
the answer was. The actual difficulty was all in the gap between the problem in the paper
and the problem on my screen: a word list that had quietly changed underneath me, an
infinity that destroyed information I needed, and a benchmark that agreed with a published
proof while two bugs sat under it.

Optimal is a property of a model, and the model is the part nobody publishes a proof
for.

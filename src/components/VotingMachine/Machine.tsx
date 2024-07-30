import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import fonts from 'google-fonts';
import classNames from 'classnames';

import styles from './styles.module.scss';
import Store, { PartialVote } from '@/store';
import Anime, { AnimeAnimParams } from 'animejs';

import 'simple-line-icons';
import { createPortal } from 'react-dom';
import Lottie, { AnimationItem } from 'lottie-web';

fonts.add({
  Montserrat: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const VOTE_ELEMENT_SIZE = 96;

export const Machine = observer(() => {
  const animationState = useRef({ running: 0 });
  const wandAnimationRef = useRef<HTMLDivElement>(null);
  const face01AnimationRef = useRef<HTMLDivElement>(null);
  const face02AnimationRef = useRef<HTMLDivElement>(null);

  const [forceUpdateIndex, setForceUpdateIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isApplyingMagic, setIsApplyingMagic] = useState(false);

  const disableAddVoteButton = isAnimating || isApplyingMagic;

  const addVote = useCallback((vote: PartialVote) => {
    Store.addVote(vote);
  }, []);

  const anime = useCallback((props: AnimeAnimParams) => {
    const updateIsAnimatingState = () => setIsAnimating(animationState.current.running > 0);
    Anime({
      ...props,
      begin: () => {
        animationState.current.running += 1;
        updateIsAnimatingState();
      },
      complete: () => {
        animationState.current.running -= 1;
        updateIsAnimatingState();
      },
    });
  }, []);

  useEffect(() => {
    const tid = setTimeout(async () => {
      if (!Store.hasMagicToApply()) return;

      const sleep = (delay: number) => new Promise((accept) => setTimeout(accept, delay));

      setIsApplyingMagic(true);
      await sleep(1500);
      while (Store.applyNextMagic()) await sleep(1000);
      setIsApplyingMagic(false);
    }, 2500);

    return () => clearTimeout(tid);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Store.votes.length]);

  useLayoutEffect(() => {
    const c1 = wandAnimationRef.current;
    const c2 = face01AnimationRef.current;
    const c3 = face02AnimationRef.current;
    if (!c1 || !c2 || !c3) return;

    const animations: Array<AnimationItem> = [];
    animations.push(Lottie.loadAnimation({ container: c1, path: '/animations/wand.json' }));
    animations.push(Lottie.loadAnimation({ container: c2, path: '/animations/face-02.json' }));
    animations.push(Lottie.loadAnimation({ container: c3, path: '/animations/face-01.json' }));
    return () => animations.forEach((a) => a.destroy());
  }, []);

  useLayoutEffect(() => {
    const tid = setTimeout(() => {
      const bucketElementsPerCandidate: Record<number, HTMLElement | null> = {};
      Store.candidates.forEach(({ id }) => {
        bucketElementsPerCandidate[id] = document.querySelector(`[data-bucket="${id}"]`);

        const statsElement = document.querySelector(`[data-candidate-stats="${id}"]`);
        if (!statsElement) return;

        const stats = {
          votesCount: parseFloat(statsElement?.getAttribute('data-candidate-stats-votes-count') ?? '0'),
          votesPercent: parseFloat(statsElement?.getAttribute('data-candidate-stats-votes-percent') ?? '0'),
        };
        const targetStats = Store.getCandidateStats(id);

        statsElement.setAttribute('data-candidate-stats-votes-count', targetStats.votesCount.toFixed(0));
        statsElement.setAttribute('data-candidate-stats-votes-percent', targetStats.votesPercent.toFixed(2));

        anime({
          targets: stats,
          votesCount: targetStats.votesCount,
          votesPercent: targetStats.votesPercent,
          easing: 'linear',
          update: () => {
            statsElement.innerHTML = `${stats.votesCount.toFixed(0)} votos (${(100 * stats.votesPercent).toFixed(1)}%)`;
          },
        });
      });

      Store.candidates.forEach((candidate) => {
        Store.votes
          .filter((v) => v.candidateId === candidate.id)
          .reverse()
          .forEach(({ id, candidateId }, index) => {
            const bucketElement = bucketElementsPerCandidate[candidateId];
            if (!bucketElement) return;

            const bucketRect = bucketElement.getBoundingClientRect();
            const translateX = bucketRect.left + bucketRect.width / 2;

            const sigmoid = (x: number) => 2 * (1 / (1 + Math.exp(-x * 2))) - 1.0;

            const maxStackHeight = 10;
            const yOffsetProgress = sigmoid(index / maxStackHeight);
            const yOffsetMax = bucketRect.height - VOTE_ELEMENT_SIZE;
            const translateY = bucketRect.y + VOTE_ELEMENT_SIZE / 2 + yOffsetProgress * yOffsetMax;

            const opacity = sigmoid(Math.max(2.5 * maxStackHeight - index, 0) / maxStackHeight);

            anime({
              targets: `[data-vote="${id}"]`,
              duration: 600,
              easing: 'easeInOutQuad',
              translateX: `${translateX}px`,
              translateY: `${translateY}px`,
              rotateX: `45deg`,
              rotateZ: `45deg`,
            });

            anime({
              targets: `[data-vote-paper="${id}"]`,
              duration: 600,
              easing: 'linear',
              opacity,
            });
          });
      });
    }, 400);

    return () => clearTimeout(tid);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Store.votes, forceUpdateIndex]);

  useLayoutEffect(() => {
    const handler = () => setForceUpdateIndex((curr) => curr + 1);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className={styles.votingMachine}>
      <div className={styles.votingMachineContent}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.textBold}>A Máquina Mágica de Votos</h1>
          <h4>Vote o quanto quiser, o candidato corrupto sempre vence...</h4>
        </div>

        <div className={styles.candidates}>
          <div className={styles.candidatesRow}>
            {Store.candidates.map(({ id, name, bio }, index) => (
              <div key={id} className={styles.candidate}>
                <div key={id} className={styles.candidateContent}>
                  <div className={styles.candidateAvatarWrapper}>
                    <div ref={index === 0 ? face01AnimationRef : face02AnimationRef} />
                  </div>

                  <div className={styles.candidateInfo}>
                    <h4 className={classNames(styles.textBold, styles.textCenter)}>{name}</h4>
                    <h2 className={classNames(styles.textBold, styles.textCenter)} data-candidate-stats={id}>
                      0 votos (0.0%)
                    </h2>

                    <p className={classNames(styles.textCenter, styles.hideOnMobile)}>{bio}</p>

                    <div className={styles.candidateActions}>
                      <button disabled={disableAddVoteButton} onClick={() => addVote({ candidateId: id })}>
                        Votar neste candidato
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.bucket}>
                  <div className={styles.bucketVotes} data-bucket={id} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {[...Store.votes.map((vote, index) => ({ vote, index }))]
          .sort((a, b) => a.vote.id - b.vote.id)
          .map(({ vote: { id }, index }) =>
            createPortal(
              <div
                key={id}
                className={styles.vote}
                data-vote={id}
                style={{
                  zIndex: index,
                  transform: [
                    `translateX(${window.innerWidth / 2}px)`,
                    `translateY(${window.innerHeight / 2}px)`,
                    `rotateX(0deg)`,
                    `rotateZ(${Math.pow((index % 6) - 3, 2.0) * 2}deg)`,
                  ].join(' '),
                }}
              >
                <div className={styles.votePaper} data-vote-paper={id}>
                  <p className={styles.textBold}>VOTO</p>
                </div>
              </div>,
              document.body,
            ),
          )}

        {createPortal(
          <div
            ref={wandAnimationRef}
            className={classNames(styles.wandAnimation, { [styles.active]: isApplyingMagic })}
          />,
          document.body,
        )}
      </div>
    </div>
  );
});

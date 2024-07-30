import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import fonts from 'google-fonts';
import classNames from 'classnames';

import styles from './styles.module.scss';
import Store, { PartialVote } from '@/store';
import Anime, { AnimeAnimParams } from 'animejs';

import 'simple-line-icons';

fonts.add({
  Montserrat: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const VOTE_ELEMENT_SIZE = 96;

export const Machine = observer(() => {
  const animationState = useRef({ running: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAplyingMagic, setIsApplyingMagic] = useState(false);

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
      setIsApplyingMagic(true);

      // while(true) {
      //   Store.targetCandidate;
      // }

      setIsApplyingMagic(false);
    }, 2500);

    return () => clearTimeout(tid);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Store.votes.length]);

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
            const translateX = bucketRect.x + bucketRect.width / 2;

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
  }, [Store.votes.length]);

  return (
    <div className={styles.votingMachine}>
      <div className={styles.votingMachineContent}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.textBold}>A Máquina Mágica de Votos</h1>
          <p>Vote o quanto quiser, o resultado é sempre 51%</p>
        </div>

        <div className={styles.candidates}>
          <div className={styles.candidatesRow}>
            {Store.candidates.map(({ id, name, bio }) => (
              <div key={id} className={styles.candidate}>
                <div className={styles.candidateAvatarWrapper}>
                  <i className={'icon-user'} />
                </div>
                <div className={styles.candidateInfo}>
                  <h4 className={classNames(styles.textBold)}>{name}</h4>
                  <p>{bio}</p>
                  <button disabled={isAnimating} onClick={() => addVote({ candidateId: id })}>
                    Votar neste candidato
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.buckets}>
          {Store.candidates.map(({ id, name }) => {
            return (
              <div key={id} className={styles.bucket}>
                <div className={styles.bucketInfo}>
                  <p className={styles.textBold}>{name}</p>
                  <h4 className={styles.textBold} data-candidate-stats={id} />
                </div>
                <div className={styles.bucketVotes} data-bucket={id} />
              </div>
            );
          })}
        </div>

        {Store.votes.map(({ id }, index) =>
          createPortal(
            <div
              key={id}
              className={styles.vote}
              data-vote={id}
              style={{
                transform: [
                  `translateX(${window.innerWidth / 2}px)`,
                  `translateY(${window.innerHeight / 2}px)`,
                  `rotateX(0deg)`,
                  `rotateZ(${Math.pow((index % 6) - 3, 2.0) * 2}deg)`,
                ].join(' '),
              }}
            >
              <div className={styles.votePaper} data-vote-paper={id}>
                <p className={styles.textBold}>1 vote</p>
              </div>
            </div>,
            document.body,
          ),
        )}
      </div>
    </div>
  );
});

import { makeAutoObservable } from 'mobx';

export interface Candidate {
  id: CandidateID;
  name: string;
  code: string;
  bio: string;
}

export interface Vote {
  id: number;
  candidateId: CandidateID;
}

export type PartialVote = Omit<Vote, 'id'>;

export enum CandidateID {
  CANDIDATE_1 = 0,
  CANDIDATE_2 = 1,
}

export class Store {
  VOTE_SERIAL = 10e6;

  candidates: Array<Candidate> = [
    {
      id: CandidateID.CANDIDATE_1,
      name: 'Jenisvaldo Corrupto',
      code: '11',
      bio: `
        Seu histórico de corrupção é antigo e conhecido, mas muitas pessoas lesadas
        ainda votam em Jenisvaldo.
      `
        .trim()
        .replace(/\s+/g, ' '),
    },
    {
      id: CandidateID.CANDIDATE_2,
      name: 'Abirobaldo Honesto',
      code: '85',
      bio: `
        Teve pais que lhe ensinaram a ser honesto. Sonha em melhorar a 
        vida das pessoas, e fazer crescer o seu país.
      `
        .trim()
        .replace(/\s+/g, ' '),
    },
  ];
  targetCandidate = CandidateID.CANDIDATE_1;
  targetPercentage = 0.51;

  votes: Array<Vote> = [];

  constructor() {
    makeAutoObservable(this);

    this.candidates.forEach(({ id }) => {
      new Array(5).fill(null).forEach(() => {
        this.addVote({ candidateId: id });
      });
    });
  }

  addVote(vote: PartialVote) {
    this.votes = [...this.votes, { id: ++this.VOTE_SERIAL, ...vote }];
  }

  hasMagicToApply() {
    const { votesPercent } = this.getTargetCandidateStats();
    return votesPercent < this.targetPercentage;
  }

  applyNextMagic() {
    if (this.hasMagicToApply()) {
      const targetVotesIndexes = this.votes
        .map((v, i) => (v.candidateId !== this.targetCandidate ? i : -1))
        .filter((i) => i !== -1);

      if (targetVotesIndexes.length) {
        const targetVoteIndex = [...targetVotesIndexes].reverse()[0];
        const targetVote = this.votes[targetVoteIndex];

        this.votes = [
          ...this.votes.slice(0, targetVoteIndex),
          ...this.votes.slice(targetVoteIndex + 1),
          { ...targetVote, candidateId: this.targetCandidate },
        ];
        return true;
      }
    }
    return false;
  }

  getTargetCandidateStats() {
    return this.getCandidateStats(this.targetCandidate);
  }

  getCandidateStats(id: CandidateID) {
    const votes = this.votes.filter((v) => v.candidateId === id);
    const votesCount = votes.length;
    const votesPercent = votesCount / this.votes.length;
    return {
      votes,
      votesCount,
      votesPercent,
    };
  }
}

export default new Store();

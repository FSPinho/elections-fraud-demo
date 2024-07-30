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
      name: 'Jenisvaldo Catanduvas',
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
      name: 'Abirobaldo Jabuticaba',
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

    new Array(10).fill(null).forEach(() => {
      this.addVote({ candidateId: CandidateID.CANDIDATE_1 });
    });
  }

  addVote(vote: PartialVote) {
    this.votes = [...this.votes, { id: ++this.VOTE_SERIAL, ...vote }];
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

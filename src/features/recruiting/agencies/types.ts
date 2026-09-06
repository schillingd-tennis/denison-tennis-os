export type RecruitingAgency = {
  id: string; name: string; city: string; state: string; website: string; phone: string;
  status: string; notes: string;
};

export type RecruitingAgent = {
  id: string; agencyId: string; agencyName: string; firstName: string; lastName: string;
  title: string; email: string; phone: string; city: string; state: string; status: string; notes: string;
};

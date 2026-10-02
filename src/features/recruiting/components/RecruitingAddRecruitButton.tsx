"use client";

import { ADD_RECRUIT_BUTTON_CLASS, useAddRecruitDrawer } from "../useAddRecruitDrawer";

export default function RecruitingAddRecruitButton() {
  const openAddRecruitDrawer = useAddRecruitDrawer();
  return (
    <button type="button" className={ADD_RECRUIT_BUTTON_CLASS} onClick={openAddRecruitDrawer}>
      + ADD RECRUIT
    </button>
  );
}

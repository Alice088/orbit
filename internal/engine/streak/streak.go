package streak

import "time"

type State struct {
	CurrentDays     int
	LongestDays     int
	MissesInRow     int
	LastSuccessDate *time.Time
}

type Milestone struct {
	Days    int
	BonusXP int
}

type MissResult struct {
	State         State
	Broken        bool
	PenaltyNeeded bool
}

func dayOf(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func OnSuccess(s State, today time.Time) State {
	td := dayOf(today)
	switch {
	case s.LastSuccessDate == nil:
		s.CurrentDays = 1
		s.MissesInRow = 0
		s.LastSuccessDate = &td
	case dayOf(*s.LastSuccessDate).Equal(td):
		return s
	case td.Equal(dayOf(*s.LastSuccessDate).AddDate(0, 0, 1)):
		s.CurrentDays++
		s.MissesInRow = 0
		s.LastSuccessDate = &td
	default:
		s.CurrentDays = 1
		s.MissesInRow = 0
		s.LastSuccessDate = &td
	}
	if s.CurrentDays > s.LongestDays {
		s.LongestDays = s.CurrentDays
	}
	return s
}

func OnMiss(s State, day time.Time) MissResult {
	missed := 0
	if s.LastSuccessDate != nil {
		missed = int(dayOf(day).Sub(dayOf(*s.LastSuccessDate)).Hours() / 24)
		if missed < 0 {
			missed = 0
		}
	}
	result := MissResult{State: s, Broken: false, PenaltyNeeded: false}
	if missed >= 2 {
		s.CurrentDays = 0
		s.MissesInRow = 0
		s.LastSuccessDate = nil
		result.Broken = true
		result.PenaltyNeeded = true
	} else {
		s.MissesInRow = missed
	}
	result.State = s
	return result
}

func MilestoneBonus(milestones []Milestone, currentDays int) (int, bool) {
	for _, m := range milestones {
		if m.Days == currentDays {
			return m.BonusXP, true
		}
	}
	return 0, false
}

func ScaledThreshold(base, level int) int {
	t := base
	for l := 2; l <= level; l++ {
		t = (t*3 + 1) / 2
	}
	return t
}

package streak

import (
	"testing"
	"time"
)

func day(offset int) time.Time {
	return time.Date(2026, 8, 1+offset, 10, 0, 0, 0, time.UTC)
}

func TestOnSuccess(t *testing.T) {
	s := State{}
	s = OnSuccess(s, day(0))
	if s.CurrentDays != 1 || s.LongestDays != 1 {
		t.Fatalf("first success: current=%d longest=%d, want 1,1", s.CurrentDays, s.LongestDays)
	}
	s = OnSuccess(s, day(1))
	if s.CurrentDays != 2 || s.LongestDays != 2 {
		t.Fatalf("consecutive: current=%d longest=%d, want 2,2", s.CurrentDays, s.LongestDays)
	}
	same := OnSuccess(s, day(1))
	if same.CurrentDays != 2 {
		t.Fatalf("same day duplicate: current=%d, want 2", same.CurrentDays)
	}
	s = OnSuccess(s, day(5))
	if s.CurrentDays != 1 || s.LongestDays != 2 {
		t.Fatalf("gap resets: current=%d longest=%d, want 1,2", s.CurrentDays, s.LongestDays)
	}
}

func TestOnMiss(t *testing.T) {
	s := State{}
	s = OnSuccess(s, day(0))
	r := OnMiss(s, day(1))
	if r.State.MissesInRow != 1 || r.Broken || r.PenaltyNeeded {
		t.Fatalf("first miss: misses=%d broken=%v penalty=%v, want 1,false,false", r.State.MissesInRow, r.Broken, r.PenaltyNeeded)
	}
	if r.State.CurrentDays != 1 {
		t.Fatalf("first miss must preserve streak, current=%d", r.State.CurrentDays)
	}
	r = OnMiss(s, day(2))
	if !r.Broken || !r.PenaltyNeeded || r.State.CurrentDays != 0 {
		t.Fatalf("second miss: broken=%v penalty=%v current=%d, want true,true,0", r.Broken, r.PenaltyNeeded, r.State.CurrentDays)
	}
	if r.State.LongestDays != 1 {
		t.Fatalf("longest must be preserved, got %d", r.State.LongestDays)
	}
	if r.State.LastSuccessDate != nil || r.State.MissesInRow != 0 {
		t.Fatalf("broken streak must reset last success and misses, got %v/%d", r.State.LastSuccessDate, r.State.MissesInRow)
	}
	after := OnMiss(r.State, day(3))
	if after.PenaltyNeeded {
		t.Fatalf("no repeat penalty after break, got %+v", after)
	}
	fresh := OnSuccess(r.State, day(4))
	if fresh.CurrentDays != 1 {
		t.Fatalf("success after break starts fresh, got %d", fresh.CurrentDays)
	}
}

func TestOnMissBeforeSuccess(t *testing.T) {
	s := State{}
	s = OnSuccess(s, day(5))
	r := OnMiss(s, day(3))
	if r.PenaltyNeeded || r.State.MissesInRow != 0 || r.State.CurrentDays != 1 {
		t.Fatalf("miss before last success must be no-op, got %+v", r)
	}
}

func TestMilestoneBonus(t *testing.T) {
	ms := []Milestone{
		{Days: 7, BonusXP: 5},
		{Days: 30, BonusXP: 25},
	}
	if got, ok := MilestoneBonus(ms, 7); !ok || got != 5 {
		t.Fatalf("MilestoneBonus(7) = %d,%v, want 5,true", got, ok)
	}
	if got, ok := MilestoneBonus(ms, 8); ok || got != 0 {
		t.Fatalf("MilestoneBonus(8) = %d,%v, want 0,false", got, ok)
	}
}

func TestScaledThreshold(t *testing.T) {
	cases := []struct {
		base  int
		level int
		want  int
	}{
		{3, 1, 3},
		{3, 2, 5},
		{3, 3, 8},
		{3, 4, 12},
		{3, 5, 18},
		{7, 2, 11},
		{30, 2, 45},
		{1, 2, 2},
		{14, 3, 32},
	}
	for _, c := range cases {
		if got := ScaledThreshold(c.base, c.level); got != c.want {
			t.Fatalf("ScaledThreshold(%d,%d) = %d, want %d", c.base, c.level, got, c.want)
		}
	}
}

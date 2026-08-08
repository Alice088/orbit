package progress

import "testing"

func TestGoalPercent(t *testing.T) {
	cases := []struct {
		earned int
		total  int
		want   int
	}{
		{0, 1000, 0},
		{100, 1000, 10},
		{1000, 1000, 100},
		{1500, 1000, 100},
		{-50, 1000, 0},
		{100, 0, 0},
	}
	for _, c := range cases {
		if got := GoalPercent(c.earned, c.total); got != c.want {
			t.Fatalf("GoalPercent(%d,%d) = %d, want %d", c.earned, c.total, got, c.want)
		}
	}
}

package economy

import "testing"

func TestHabitXPCap(t *testing.T) {
	cases := []struct {
		name      string
		daily     int
		base      int
		bonus     int
		cap       int
		wantBase  int
		wantBonus int
	}{
		{"under cap", 30, 5, 0, 50, 5, 0},
		{"reaches cap", 45, 10, 0, 50, 5, 0},
		{"over cap", 50, 10, 0, 50, 0, 0},
		{"cap disabled", 100, 10, 0, 0, 10, 0},
		{"bonus within remaining", 40, 5, 5, 50, 5, 5},
		{"bonus clamped", 45, 5, 10, 50, 5, 0},
		{"base clamps first", 48, 5, 10, 50, 2, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			base, bonus := HabitXPCap(c.daily, c.base, c.bonus, c.cap)
			if base != c.wantBase || bonus != c.wantBonus {
				t.Fatalf("HabitXPCap(%d,%d,%d,%d) = %d,%d, want %d,%d",
					c.daily, c.base, c.bonus, c.cap, base, bonus, c.wantBase, c.wantBonus)
			}
		})
	}
}

func TestWeeklySuggestion(t *testing.T) {
	if got := WeeklySuggestion(100); got != 110 {
		t.Fatalf("WeeklySuggestion(100) = %d, want 110", got)
	}
	if got := WeeklySuggestion(0); got != 0 {
		t.Fatalf("WeeklySuggestion(0) = %d, want 0", got)
	}
}

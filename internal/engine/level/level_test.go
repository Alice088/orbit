package level

import "testing"

func TestForXP(t *testing.T) {
	cases := []struct {
		xp   int
		want string
	}{
		{0, "Apprentice"},
		{100, "Apprentice"},
		{101, "Practitioner"},
		{500, "Practitioner"},
		{501, "Specialist"},
		{1500, "Specialist"},
		{1501, "Master"},
		{10000, "Master"},
	}
	for _, c := range cases {
		if got := ForXP(c.xp); got.Name != c.want {
			t.Fatalf("ForXP(%d) = %q, want %q", c.xp, got.Name, c.want)
		}
	}
}

func TestNextThreshold(t *testing.T) {
	if got, ok := NextThreshold(100); !ok || got != 101 {
		t.Fatalf("NextThreshold(100) = %d,%v, want 101,true", got, ok)
	}
	if got, ok := NextThreshold(2000); ok || got != 0 {
		t.Fatalf("NextThreshold(2000) = %d,%v, want 0,false", got, ok)
	}
}

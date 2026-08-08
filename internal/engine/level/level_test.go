package level

import "testing"

func TestForXP(t *testing.T) {
	cases := []struct {
		xp   int
		want string
	}{
		{0, "Beginner Kitty"},
		{99, "Beginner Kitty"},
		{100, "Curious Kitty"},
		{299, "Curious Kitty"},
		{300, "Space Kitty"},
		{599, "Space Kitty"},
		{600, "Orbit Kitty"},
		{999, "Orbit Kitty"},
		{1000, "Cosmic Kitty"},
		{1499, "Cosmic Kitty"},
		{1500, "Stellar Kitty"},
		{2499, "Stellar Kitty"},
		{2500, "Galaxy Kitty"},
		{3999, "Galaxy Kitty"},
		{4000, "Astronaut Kitty"},
		{6499, "Astronaut Kitty"},
		{6500, "Cosmic Explorer"},
		{9999, "Cosmic Explorer"},
		{10000, "Master Kitty"},
		{14999, "Master Kitty"},
		{15000, "Legendary Kitty"},
		{24999, "Legendary Kitty"},
		{25000, "Orbit Legend"},
		{1000000, "Orbit Legend"},
	}
	for _, c := range cases {
		if got := ForXP(c.xp); got.Name != c.want {
			t.Fatalf("ForXP(%d) = %q, want %q", c.xp, got.Name, c.want)
		}
	}
}

func TestNextThreshold(t *testing.T) {
	if got, ok := NextThreshold(100); !ok || got != 300 {
		t.Fatalf("NextThreshold(100) = %d,%v, want 300,true", got, ok)
	}
	if got, ok := NextThreshold(25000); ok || got != 0 {
		t.Fatalf("NextThreshold(25000) = %d,%v, want 0,false", got, ok)
	}
}

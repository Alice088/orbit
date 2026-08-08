package scoring

import "testing"

func TestGPP(t *testing.T) {
	cases := []struct {
		name string
		to   int
		from int
		coef int
		want int
	}{
		{"full coef", 600, 300, 100, 300},
		{"half coef", 600, 300, 50, 150},
		{"rounding down", 600, 301, 100, 299},
		{"coef clamp low", 600, 300, 10, 300},
		{"coef clamp high", 600, 300, 150, 300},
		{"negative delta", 300, 600, 100, 0},
		{"zero delta", 100, 100, 100, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := GPP(c.to, c.from, c.coef); got != c.want {
				t.Fatalf("GPP(%d,%d,%d) = %d, want %d", c.to, c.from, c.coef, got, c.want)
			}
		})
	}
}

func TestTaskXP(t *testing.T) {
	cases := []struct {
		name       string
		gpp        int
		difficulty string
		want       int
	}{
		{"normal", 100, "normal", 10},
		{"hard", 100, "hard", 15},
		{"epic", 100, "epic", 20},
		{"easy", 100, "easy", 5},
		{"rounding", 15, "hard", 1},
		{"unknown difficulty defaults to normal", 100, "insane", 10},
		{"zero gpp", 0, "epic", 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := TaskXP(c.gpp, c.difficulty); got != c.want {
				t.Fatalf("TaskXP(%d,%q) = %d, want %d", c.gpp, c.difficulty, got, c.want)
			}
		})
	}
}

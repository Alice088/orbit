package level

type Level struct {
	Index int
	Name  string
	MinXP int
}

var thresholds = []Level{
	{Index: 0, Name: "Apprentice", MinXP: 0},
	{Index: 1, Name: "Practitioner", MinXP: 101},
	{Index: 2, Name: "Specialist", MinXP: 501},
	{Index: 3, Name: "Master", MinXP: 1501},
}

func ForXP(xp int) Level {
	current := thresholds[0]
	for _, l := range thresholds {
		if xp >= l.MinXP {
			current = l
		}
	}
	return current
}

func NextThreshold(xp int) (int, bool) {
	for _, l := range thresholds {
		if xp < l.MinXP {
			return l.MinXP, true
		}
	}
	return 0, false
}

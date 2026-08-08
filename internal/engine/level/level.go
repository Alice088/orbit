package level

type Level struct {
	Index int
	Name  string
	MinXP int
}

var thresholds = []Level{
	{Index: 0, Name: "Beginner Kitty", MinXP: 0},
	{Index: 1, Name: "Curious Kitty", MinXP: 100},
	{Index: 2, Name: "Space Kitty", MinXP: 300},
	{Index: 3, Name: "Orbit Kitty", MinXP: 600},
	{Index: 4, Name: "Cosmic Kitty", MinXP: 1000},
	{Index: 5, Name: "Stellar Kitty", MinXP: 1500},
	{Index: 6, Name: "Galaxy Kitty", MinXP: 2500},
	{Index: 7, Name: "Astronaut Kitty", MinXP: 4000},
	{Index: 8, Name: "Cosmic Explorer", MinXP: 6500},
	{Index: 9, Name: "Master Kitty", MinXP: 10000},
	{Index: 10, Name: "Legendary Kitty", MinXP: 15000},
	{Index: 11, Name: "Orbit Legend", MinXP: 25000},
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

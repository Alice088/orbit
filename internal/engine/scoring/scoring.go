package scoring

const (
	CoefMin = 50
	CoefMax = 100
)

var difficultyMultipliers = map[string]int{
	"easy":   50,
	"normal": 100,
	"hard":   150,
	"epic":   200,
}

func DifficultyMultiplier(difficulty string) int {
	if m, ok := difficultyMultipliers[difficulty]; ok {
		return m
	}
	return 100
}

func GPP(milestoneTo int, milestoneFrom int, contributionCoef int) int {
	if contributionCoef < CoefMin || contributionCoef > CoefMax {
		contributionCoef = CoefMax
	}
	delta := milestoneTo - milestoneFrom
	if delta < 0 {
		return 0
	}
	return delta * contributionCoef / 100
}

func TaskXP(gpp int, difficulty string) int {
	xp := gpp * DifficultyMultiplier(difficulty) / 100
	if xp < 1 {
		return 1
	}
	return xp
}

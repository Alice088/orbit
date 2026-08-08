package progress

func GoalPercent(earnedGPP int, totalGPP int) int {
	if totalGPP <= 0 {
		return 0
	}
	p := earnedGPP * 100 / totalGPP
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}

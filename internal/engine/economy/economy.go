package economy

func HabitXPCap(dailyHabitXP int, base int, bonus int, cap int) (int, int) {
	if cap <= 0 {
		return base, bonus
	}
	remaining := cap - dailyHabitXP
	if remaining <= 0 {
		return 0, 0
	}
	baseAwarded := base
	if baseAwarded > remaining {
		baseAwarded = remaining
	}
	remaining -= baseAwarded
	bonusAwarded := bonus
	if bonusAwarded > remaining {
		bonusAwarded = remaining
	}
	return baseAwarded, bonusAwarded
}

func WeeklySuggestion(avgDailyXP int) int {
	return avgDailyXP * 11 / 10
}

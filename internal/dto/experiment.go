package dto

type MetricInput struct {
	Name           string   `json:"name"`
	Type           string   `json:"type"`
	Unit           string   `json:"unit,omitempty"`
	Direction      string   `json:"direction,omitempty"`
	IsPrimary      bool     `json:"is_primary"`
	BaselineSource string   `json:"baseline_source,omitempty"`
	BaselineValue  *float64 `json:"baseline_value,omitempty"`
	BaselineDenom  *float64 `json:"baseline_denom,omitempty"`
}

type CreateExperimentRequest struct {
	Title           string        `json:"title"`
	Category        string        `json:"category,omitempty"`
	Tags            []string      `json:"tags,omitempty"`
	Change          string        `json:"change"`
	SuccessCriteria string        `json:"success_criteria,omitempty"`
	DurationDays    int           `json:"duration_days"`
	Metrics         []MetricInput `json:"metrics"`
}

type UpdateExperimentRequest struct {
	Title    string   `json:"title,omitempty"`
	Category string   `json:"category,omitempty"`
	Tags     []string `json:"tags,omitempty"`
}

type UpdateVersionRequest struct {
	Change          string        `json:"change,omitempty"`
	SuccessCriteria string        `json:"success_criteria,omitempty"`
	DurationDays    int           `json:"duration_days"`
	Metrics         []MetricInput `json:"metrics,omitempty"`
}

type CheckinValueInput struct {
	MetricID   string   `json:"metric_id"`
	NumValue   *float64 `json:"num_value,omitempty"`
	DenomValue *float64 `json:"denom_value,omitempty"`
	TextValue  *string  `json:"text_value,omitempty"`
}

type UpsertCheckinRequest struct {
	Values []CheckinValueInput `json:"values"`
	Note   string              `json:"note,omitempty"`
}

type ReflectionRequest struct {
	Reflection string `json:"reflection"`
}

type MetricStatsResponse struct {
	Average     *float64 `json:"average,omitempty"`
	Min         *float64 `json:"min,omitempty"`
	Max         *float64 `json:"max,omitempty"`
	ChangePct   *float64 `json:"change_pct,omitempty"`
	TrendBetter *bool    `json:"trend_better,omitempty"`
	Consistency float64  `json:"consistency"`
	ValueCount  int      `json:"value_count"`
}

type MetricResponse struct {
	ID                string               `json:"id"`
	Name              string               `json:"name"`
	Type              string               `json:"type"`
	Unit              string               `json:"unit,omitempty"`
	Direction         string               `json:"direction,omitempty"`
	IsPrimary         bool                 `json:"is_primary"`
	BaselineSource    string               `json:"baseline_source"`
	BaselineValue     *float64             `json:"baseline_value,omitempty"`
	BaselineDenom     *float64             `json:"baseline_denom,omitempty"`
	SuggestedBaseline *float64             `json:"suggested_baseline,omitempty"`
	Stats             *MetricStatsResponse `json:"stats,omitempty"`
}

type CheckinValueResponse struct {
	MetricID   string   `json:"metric_id"`
	NumValue   *float64 `json:"num_value,omitempty"`
	DenomValue *float64 `json:"denom_value,omitempty"`
	TextValue  *string  `json:"text_value,omitempty"`
}

type CheckinResponse struct {
	ID     string                `json:"id"`
	Day    string                `json:"day"`
	Note   string                `json:"note"`
	Values []CheckinValueResponse `json:"values"`
}

type VerdictResponse struct {
	PrimaryMetricID string   `json:"primary_metric_id"`
	MetricName      string   `json:"metric_name"`
	ChangePct       *float64 `json:"change_pct,omitempty"`
	Outcome         string   `json:"outcome"`
}

type PrimarySummary struct {
	MetricName  string   `json:"metric_name"`
	Average     *float64 `json:"average,omitempty"`
	ChangePct   *float64 `json:"change_pct,omitempty"`
	Consistency float64  `json:"consistency"`
}

type VersionSummaryResponse struct {
	ID             string          `json:"id"`
	VersionNumber  int             `json:"version_number"`
	Change         string          `json:"change"`
	Status         string          `json:"status"`
	DurationDays   int             `json:"duration_days"`
	DayIndex       int             `json:"day_index"`
	DaysLeft       int             `json:"days_left"`
	PrimarySummary *PrimarySummary `json:"primary_summary,omitempty"`
	IsBest         bool            `json:"is_best"`
	IsCurrent      bool            `json:"is_current"`
}

type BestResponse struct {
	VersionID string   `json:"version_id"`
	ChangePct *float64 `json:"change_pct,omitempty"`
}

type VersionResponse struct {
	ID              string                `json:"id"`
	ExperimentID    string                `json:"experiment_id"`
	VersionNumber   int                   `json:"version_number"`
	Change          string                `json:"change"`
	SuccessCriteria string                `json:"success_criteria"`
	DurationDays    int                   `json:"duration_days"`
	Status          string                `json:"status"`
	StartedAt       *string               `json:"started_at,omitempty"`
	CompletedAt     *string               `json:"completed_at,omitempty"`
	Reflection      string                `json:"reflection"`
	DayIndex        int                   `json:"day_index"`
	DaysLeft        int                   `json:"days_left"`
	Metrics         []MetricResponse      `json:"metrics"`
	Checkins        []CheckinResponse     `json:"checkins"`
	Verdict         *VerdictResponse      `json:"verdict,omitempty"`
	IsBest          bool                  `json:"is_best"`
	PrimarySummary  *PrimarySummary       `json:"primary_summary,omitempty"`
}

type ExperimentResponse struct {
	ID             string                  `json:"id"`
	Title          string                  `json:"title"`
	Category       string                  `json:"category"`
	Tags           []string                `json:"tags"`
	CreatedAt      string                  `json:"created_at"`
	ActiveCount    int                     `json:"active_count"`
	CompletedCount int                     `json:"completed_count"`
	AbortedCount   int                     `json:"aborted_count"`
	TotalVersions  int                     `json:"total_versions"`
	Current        *VersionSummaryResponse `json:"current,omitempty"`
	Best           *BestResponse           `json:"best,omitempty"`
	Versions       []VersionSummaryResponse `json:"versions,omitempty"`
}

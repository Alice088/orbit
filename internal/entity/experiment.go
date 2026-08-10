package entity

import "time"

type ExperimentStatus string

const (
	ExperimentStatusDraft     ExperimentStatus = "draft"
	ExperimentStatusRunning   ExperimentStatus = "running"
	ExperimentStatusCompleted ExperimentStatus = "completed"
	ExperimentStatusAborted   ExperimentStatus = "aborted"
)

type MetricType string

const (
	MetricTypeCount    MetricType = "count"
	MetricTypeDuration MetricType = "duration"
	MetricTypeRate     MetricType = "rate"
	MetricTypeScore    MetricType = "score"
	MetricTypeBinary   MetricType = "binary"
	MetricTypeNote     MetricType = "note"
)

type BaselineSource string

const (
	BaselineSourceNone     BaselineSource = "none"
	BaselineSourceManual   BaselineSource = "manual"
	BaselineSourceMeasured BaselineSource = "measured"
)

type MetricDirection string

const (
	MetricDirectionHigher MetricDirection = "higher_better"
	MetricDirectionLower  MetricDirection = "lower_better"
)

type Experiment struct {
	ID        string
	UserID    string
	Title     string
	Category  string
	Tags      []string
	CreatedAt time.Time
}

type ExperimentVersion struct {
	ID              string
	ExperimentID    string
	VersionNumber   int
	Change          string
	SuccessCriteria string
	DurationDays    int
	Status          ExperimentStatus
	StartedAt       *time.Time
	CompletedAt     *time.Time
	Reflection      string
	CreatedAt       time.Time
}

type ExperimentMetric struct {
	ID             string
	VersionID      string
	Position       int
	Name           string
	Type           MetricType
	Unit           string
	Direction      MetricDirection
	IsPrimary      bool
	BaselineSource BaselineSource
	BaselineValue  *float64
	BaselineDenom  *float64
}

type ExperimentCheckin struct {
	ID        string
	VersionID string
	Day       time.Time
	Note      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type ExperimentCheckinValue struct {
	ID         string
	CheckinID  string
	MetricID   string
	NumValue   *float64
	DenomValue *float64
	TextValue  *string
}

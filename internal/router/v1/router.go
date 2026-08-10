package v1

import (
	"net/http"
	"orbit/internal/auth"
	"orbit/internal/handler"
	"orbit/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

func NewRouter(healthHandler *handler.HealthHandler, handlers *handler.Handlers, jwtManager *auth.JWTManager) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(middleware.Logging)
	r.Use(middleware.Recovery)

	r.Handle("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	r.Get("/health", healthHandler.Health)

	r.Route("/v1", func(r chi.Router) {
		r.Post("/auth/session", handlers.Auth.Session)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtManager, handlers.Auth.UserExists))

			r.Get("/me", handlers.Auth.Me)

			r.Route("/goals", func(r chi.Router) {
				r.Post("/", handlers.Goals.Create)
				r.Get("/", handlers.Goals.List)
				r.Get("/{goalID}", handlers.Goals.Detail)
				r.Patch("/{goalID}", handlers.Goals.SetParent)
				r.Get("/{goalID}/progress", handlers.Goals.Progress)
				r.Post("/{goalID}/review", handlers.Goals.Review)
				r.Delete("/{goalID}", handlers.Goals.Delete)
			})

			r.Route("/tasks", func(r chi.Router) {
				r.Post("/", handlers.Tasks.Create)
				r.Get("/", handlers.Tasks.List)
				r.Post("/{taskID}/complete", handlers.Tasks.Complete)
				r.Delete("/{taskID}", handlers.Tasks.Delete)
			})

			r.Route("/habits", func(r chi.Router) {
				r.Post("/", handlers.Habits.Create)
				r.Post("/{habitID}/complete", handlers.Habits.Complete)
				r.Get("/", handlers.Habits.List)
				r.Delete("/{habitID}", handlers.Habits.Delete)
			})

			r.Post("/checkin", handlers.Stats.CheckIn)
			r.Post("/penalties", handlers.Stats.Penalty)
			r.Get("/activity", handlers.Stats.Activity)
			r.Get("/transactions", handlers.Stats.Transactions)
			r.Get("/streaks", handlers.Stats.Streaks)
			r.Get("/achievements", handlers.Stats.Achievements)
			r.Get("/stats/today", handlers.Stats.Today)
			r.Get("/stats/week", handlers.Stats.Week)
			r.Get("/levels/current", handlers.Stats.Level)
			r.Get("/analytics/overview", handlers.Stats.Analytics)

			r.Route("/experiments", func(r chi.Router) {
				r.Post("/", handlers.Experiments.Create)
				r.Get("/", handlers.Experiments.List)
				r.Get("/{experimentID}", handlers.Experiments.Detail)
				r.Patch("/{experimentID}", handlers.Experiments.Update)
				r.Delete("/{experimentID}", handlers.Experiments.Delete)
				r.Post("/{experimentID}/versions", handlers.Experiments.Fork)
				r.Get("/{experimentID}/versions/{versionID}", handlers.Experiments.VersionDetail)
				r.Patch("/{experimentID}/versions/{versionID}", handlers.Experiments.UpdateVersion)
				r.Delete("/{experimentID}/versions/{versionID}", handlers.Experiments.DeleteVersion)
				r.Post("/{experimentID}/versions/{versionID}/start", handlers.Experiments.Start)
				r.Put("/{experimentID}/versions/{versionID}/checkins/{day}", handlers.Experiments.UpsertCheckin)
				r.Delete("/{experimentID}/versions/{versionID}/checkins/{day}", handlers.Experiments.DeleteCheckin)
				r.Post("/{experimentID}/versions/{versionID}/reflection", handlers.Experiments.Reflection)
			})
		})
	})

	return r
}

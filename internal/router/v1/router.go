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
		r.Post("/auth/register", handlers.Auth.Register)
		r.Post("/auth/login", handlers.Auth.Login)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtManager))

			r.Route("/goals", func(r chi.Router) {
				r.Post("/", handlers.Goals.Create)
				r.Get("/", handlers.Goals.List)
				r.Get("/{goalID}", handlers.Goals.Detail)
				r.Get("/{goalID}/progress", handlers.Goals.Progress)
				r.Post("/{goalID}/review", handlers.Goals.Review)
			})

			r.Route("/tasks", func(r chi.Router) {
				r.Post("/", handlers.Tasks.Create)
				r.Post("/{taskID}/complete", handlers.Tasks.Complete)
				r.Post("/{taskID}/regress", handlers.Tasks.Regress)
			})

			r.Route("/habits", func(r chi.Router) {
				r.Post("/", handlers.Habits.Create)
				r.Post("/{habitID}/complete", handlers.Habits.Complete)
				r.Get("/", handlers.Habits.List)
			})

			r.Post("/checkin", handlers.Stats.CheckIn)
			r.Get("/streaks", handlers.Stats.Streaks)
			r.Get("/achievements", handlers.Stats.Achievements)
			r.Get("/stats/today", handlers.Stats.Today)
			r.Get("/stats/week", handlers.Stats.Week)
			r.Get("/levels/current", handlers.Stats.Level)
			r.Get("/analytics/overview", handlers.Stats.Analytics)
		})
	})

	return r
}

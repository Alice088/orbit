package handler

import (
	"encoding/json"
	"net/http"
	"orbit/internal/dto"
	"orbit/internal/middleware"
	"orbit/internal/service"

	"github.com/go-chi/chi/v5"
)

type ExperimentHandler struct {
	svc *service.Service
}

func (h *ExperimentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateExperimentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.svc.CreateExperiment(r.Context(), middleware.GetUserID(r.Context()), req)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *ExperimentHandler) List(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.ListExperiments(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *ExperimentHandler) Detail(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.ExperimentDetail(r.Context(), middleware.GetUserID(r.Context()), chi.URLParam(r, "experimentID"))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *ExperimentHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateExperimentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateExperiment(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), req); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ExperimentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DeleteExperiment(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID")); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ExperimentHandler) Fork(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.ForkVersion(r.Context(), middleware.GetUserID(r.Context()), chi.URLParam(r, "experimentID"))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *ExperimentHandler) VersionDetail(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.VersionDetail(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID"))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *ExperimentHandler) UpdateVersion(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateVersionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateVersion(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID"), req); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ExperimentHandler) DeleteVersion(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DeleteVersion(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID")); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ExperimentHandler) Start(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.StartVersion(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID"))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *ExperimentHandler) UpsertCheckin(w http.ResponseWriter, r *http.Request) {
	var req dto.UpsertCheckinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.svc.UpsertCheckin(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID"), chi.URLParam(r, "day"), req)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *ExperimentHandler) DeleteCheckin(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.DeleteCheckin(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID"), chi.URLParam(r, "day")); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ExperimentHandler) Reflection(w http.ResponseWriter, r *http.Request) {
	var req dto.ReflectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.svc.SubmitReflection(r.Context(), middleware.GetUserID(r.Context()),
		chi.URLParam(r, "experimentID"), chi.URLParam(r, "versionID"), req.Reflection)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

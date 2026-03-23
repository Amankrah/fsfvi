"""URLs for FSFVI indicator data entry."""

from django.urls import path
from .views import (
    IndicatorListView,
    IndicatorDataListView,
    BulkIndicatorDataView,
    FiscalYearSummaryView,
    AvailableDataYearsView,
    CopyFiscalYearDataView,
    DeleteFiscalYearDataView,
    BulkFileImportView,
    DownloadTemplateView,
)

urlpatterns = [
    # Indicator definitions
    path("", IndicatorListView.as_view(), name="indicator-list"),

    # Indicator data CRUD
    path("data/", IndicatorDataListView.as_view(), name="indicator-data-list"),
    path("data/bulk/", BulkIndicatorDataView.as_view(), name="indicator-data-bulk"),
    path("data/summary/", FiscalYearSummaryView.as_view(), name="indicator-data-summary"),
    path("data/available-years/", AvailableDataYearsView.as_view(), name="indicator-data-years"),
    path("data/copy/", CopyFiscalYearDataView.as_view(), name="indicator-data-copy"),
    path("data/delete-year/", DeleteFiscalYearDataView.as_view(), name="indicator-data-delete-year"),

    # Bulk file import
    path("data/import/", BulkFileImportView.as_view(), name="indicator-data-import"),
    path("data/template/", DownloadTemplateView.as_view(), name="indicator-data-template"),
]

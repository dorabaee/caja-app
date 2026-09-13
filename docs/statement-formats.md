# Statement formats in Caja 0.2.7

The PDF picker preserves the existing single-step, simplified multi-step, and monthly views and adds three management reporting views approved for Caja's existing data model. These are not certifications of GAAP, NIF, or IFRS compliance. Caja currently categorizes recorded table totals as income or expenses; it cannot infer cost of sales, accruals, depreciation, taxes, or other comprehensive income.

## Research and adaptation

- **Common-size / porcentajes de ingresos.** OpenStax describes expressing income statement items as a percentage of net sales. Caja adapts this to total recorded income, explicitly labeled as such. Income is 100% when nonzero; expenses and result are divided by that same denominator. Zero income produces N/A. Negative results and percentages above 100% remain visible. [OpenStax, Principles of Finance 2e, 5.7](https://openstax.org/books/principles-finance-2e/pages/5-7-common-size-statements).
- **Quarterly comparison.** US issuer financial statements commonly present the quarter separately from the year-to-date period; ExxonMobil's June 2026 Form 10-Q presents three- and six-month income columns. Caja groups January–March, April–June, July–September, and October–December within the business's recorded year. It does not invent a prior year for comparison. [ExxonMobil Form 10-Q, condensed consolidated statement of income](https://www.sec.gov/Archives/edgar/data/2115436/000003408826000093/xom-20260630.htm).
- **Year-to-date / resultados acumulados.** Grupo Bimbo's Mexican BMV second-quarter 2025 report, page 14, presents both accumulated January–June and standalone April–June result columns. Caja provides a selected January-through-month cutoff with monthly cumulative rows. This follows the reporting-period idea, using only Caja's categories. It is not a copy of Bimbo's by-function statement. [Grupo Bimbo, 2025 BMV reports, Resultados 2T25](https://www.grupobimbo.com/es/inversionistas/reportes/reportes-bmv/reportes-trimestrales-bmv-2025).

## Export contract

One business per PDF. Formats appear once in a fixed order; at least one must be selected. All-in-one includes all six and respects the chart toggle and cumulative cutoff. Share's quick action exports all six with charts and the currently selected month as cutoff; the adjacent format picker permits customization. Sharing saves a PDF for the user to attach, without sending data automatically.

All values flow from buildStatement and the same monthly compute layer as the dashboard. Cumulative figures never include the bank opening balance and are not summed again. Charts use a shared zero baseline and retain negative amounts. Every page states the currency and reporting period. Generated files follow the app language.

## Release validation

Review localhost 0.2.7 before publishing. A browser preview cannot install a desktop update. After approval, create the signed 0.2.7 release, leave the installed 0.2.6 app in place, and test online startup detection, collapsed/expanded progress, interrupted-download retry, data persistence, restart, and the final version. Keep updater signing keys out of the repository.

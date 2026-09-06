import { sizeChart, sizeColumns } from '@/data/sizing'

/**
 * The measurements, as a table.
 *
 * Five columns will not fit a phone at a readable size, and shrinking the
 * type or wrapping `23.5–24"` onto two lines makes a table nobody can scan.
 * So it keeps its width and scrolls inside its own track instead.
 *
 * Deliberately not wrapped in a Reveal. It renders inside the product page's
 * Size & Fit accordion as well as on its own page, and a scroll-triggered
 * animation that has already fired against a collapsed panel leaves the table
 * invisible when the panel finally opens.
 */
export function SizeTable({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="label-sm py-4 pr-6 font-normal text-ash">
                Size
              </th>
              {sizeColumns.map((column) => (
                <th key={column} scope="col" className="label-sm py-4 pr-6 font-normal text-ink">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizeChart.map((row) => (
              <tr key={row.label} className="border-b border-line">
                <th
                  scope="row"
                  className="whitespace-nowrap py-4 pr-6 text-[0.95rem] font-normal text-ink"
                >
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td
                    key={sizeColumns[i]}
                    className="whitespace-nowrap py-4 pr-6 text-[0.95rem] text-fog"
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

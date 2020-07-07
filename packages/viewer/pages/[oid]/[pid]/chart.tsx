import { getProjectData } from "../../../utils/firebase"
import NotFound404 from "../../../site/404"
import { ProjectInfo } from "../../../utils/firebase"
import { NextPage } from "next"
import dynamic from "next/dynamic"

const ChartPage = dynamic(() => import("../../../site/chart-page"), {
  ssr: false,
})

/**
 * A preview page that WILL subscribe to changes to the project document.
 * It's not "live" to the dirty changes — only saved changes will cause an update.
 */
const LiveChart: NextPage<{ data: ProjectInfo }> = ({ data }) => {
  if (!data) return <NotFound404 />
  return <ChartPage data={data} />
}

LiveChart.getInitialProps = async (ctx) => {
  let { oid, pid } = ctx.query

  pid = Array.isArray(pid) ? pid[0] : pid
  oid = Array.isArray(oid) ? oid[0] : oid

  if (!pid || !oid) return { data: undefined }

  const data = await getProjectData(pid, oid)

  return { data }
}

export default LiveChart

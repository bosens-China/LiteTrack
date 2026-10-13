import { Navigate, useParams, useLocation } from 'react-router';
import { analyticsUrl, projectId } from '../navigation';
export default function SiteDetail() {
  const { id } = useParams();
  const { search } = useLocation();
  const parsed = projectId(id);
  return (
    <Navigate
      replace
      to={parsed ? analyticsUrl(parsed, search) : '/?project=invalid'}
    />
  );
}

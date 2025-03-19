import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const RequireAuth = ({ allowedUsers }) => {
    const { auth } = useAuth();
    const location = useLocation();

    return (
        auth?.data?.userType && allowedUsers.includes(auth?.data?.userType)
            ? <Outlet />
            : auth?.data?.userType 
                ? <Navigate to="/access-denied" replace />
                : <Navigate to="/login" state={{ from: location }} replace />
    );
}

export default RequireAuth;

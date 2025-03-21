import { useLocation, Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const RequireAuth = ({ allowedUsers }) => {
    const { auth } = useAuth();
    const location = useLocation();

    // console.log(auth?.user?.userType);
    

    return (
        auth?.user?.userType && allowedUsers.includes(auth?.user?.userType)
            ? <Outlet />
            : auth?.user?.userType 
                ? <Navigate to="/access-denied" replace />
                : <Navigate to="/login" state={{ from: location }} replace />
    );
}

export default RequireAuth;

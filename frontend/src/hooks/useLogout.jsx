import axios from "../api/axios";
import useAxiosPrivate from "./useAxiosPrivate";
import useAuth from "./useAuth";

const useLogout = () => {
    const { auth, setAuth } = useAuth(); 
    const axiosPrivate=useAxiosPrivate();

    const LOGOUT_URL = auth?.user?.userType === "trainer"
        ? "/api/trainer/logout"
        : "/api/trainee/logout";

    // console.log("LOGOUT_URL:", LOGOUT_URL);
    

    const logout = async () => {
        try {
            await axiosPrivate.post(
                LOGOUT_URL, 
                {}, 
                { withCredentials: true}
            );
            setAuth(null);
            console.log("Logged out");
        } catch (err) {
            console.error("Logout failed:",err);
        }
    };

    return logout;
};

export default useLogout;

import React from "react";
import { AdminLayout } from "../../templates/AdminLayout/AdminLayout";
import CompanyCareerTestManage from "../../../pages/Company/CompanyCareerTestManage";

export const CareerPathManagement: React.FC = () => {
    return (
        <AdminLayout>
            <div className="bg-white shadow-sm overflow-hidden rounded-lg">
                <CompanyCareerTestManage />
            </div>
        </AdminLayout>
    );
};

"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function SwaggerPage() {
  return (
    <main
      dir="ltr"
      style={{
        minHeight: "100vh",
        background: "#fff",
        direction: "ltr",
        textAlign: "left",
      }}
    >
      <style>{`
        .swagger-ui,
        .swagger-ui * {
          direction: ltr !important;
          text-align: initial;
        }
        .swagger-ui .opblock-summary-method {
          text-align: center;
        }
      `}</style>
      <SwaggerUI
        url="/api/openapi"
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        tryItOutEnabled
        persistAuthorization
      />
    </main>
  );
}

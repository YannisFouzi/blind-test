import React from "react";
import whyDidYouRender from "@welldone-software/why-did-you-render";

// ⚠️ TEMPORAIREMENT DÉSACTIVÉ pour diagnostiquer le bug "change in order of hooks"
// L'erreur venait de why-did-you-render qui wrappait les hooks du composant HotReload de Next
// TODO: Réactiver avec une config qui exclut les composants Next internes
if (false && process.env.NODE_ENV === "development") {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: true,
  });
}

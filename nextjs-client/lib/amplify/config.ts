import { Amplify, type ResourcesConfig } from "aws-amplify";
import { env } from "@/config";

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: env.cognitoUserPoolId,
      userPoolClientId: env.cognitoClientId,
      loginWith: {
        oauth: {
          domain: env.cognitoOAuthDomain,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [env.oauthRedirectUrl],
          redirectSignOut: [env.oauthRedirectUrl],
          responseType: "code",
          providers: ["Google", "Apple"],
        },
      },
    },
  },
};

export function configureAmplify() {
  Amplify.configure(amplifyConfig, { ssr: true });
}

export default amplifyConfig;

import { Amplify, type ResourcesConfig } from "aws-amplify";

// Determine redirect URLs based on environment
const redirectUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/`
    : process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URL || "http://localhost:3000/";

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN || "us-east-1kfpe5wcvo.auth.us-east-1.amazoncognito.com",
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [redirectUrl],
          redirectSignOut: [redirectUrl],
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

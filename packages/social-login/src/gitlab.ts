import { OAuthProviderBaseFacility, redirectUri, OAuthUser, splitName, OAuthProviderOption } from "./core"

const tokenEndPoint = "https://gitlab.com/oauth/token"
const profileEndPoint = "https://gitlab.com/api/v4/user"
const loginEndpoint = "https://gitlab.com/oauth/authorize"


export interface GitLabProfile {
    id: number,
    username: string,
    email: string,
    name: string,
    state: string,
    avatar_url: string,
    web_url: string,
    created_at: Date,
    bio: string,
    location: string,
    public_email: string,
    skype: string,
    linkedin: string,
    twitter: string,
    website_url: string,
    organization: string,
    last_sign_in_at: Date,
    confirmed_at: Date,
    theme_id: number,
    last_activity_on: Date,
    color_scheme_id: number,
    projects_limit: number,
    current_sign_in_at: Date,
    identities: any[],
    can_create_group: boolean,
    can_create_project: boolean,
    two_factor_enabled: boolean,
    external: boolean,
    private_profile: boolean
}

function transform(value: GitLabProfile): OAuthUser {
    const names = splitName(value.name)
    return {
        provider: "GitLab",
        firstName: names.firstName,
        lastName: names.lastName,
        name: value.name,
        id: value.id.toString(),
        profilePicture: value.avatar_url,
        email: value.email,
        raw: value
    }
}

class GitLabOAuthFacility extends OAuthProviderBaseFacility {
    constructor(opt?: OAuthProviderOption) {
        super({
            ...opt,
            profile: {
                endpoint: profileEndPoint,
                params: { ...opt?.profileParams },
                transformer: transform
            },
            login: {
                endpoint: loginEndpoint,
                params: {
                    response_type: "code"
                }
            },
            token: {
                endpoint: tokenEndPoint,
                params: { }
            },
            provider: "GitLab"
        }, opt?.loginEndPoint ?? "/auth/gitlab/login")
    }
}

export { GitLabOAuthFacility }
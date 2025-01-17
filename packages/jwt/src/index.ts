import {
    analyzeAuthPolicyNameConflict,
    Authenticated,
    AuthenticatedAuthPolicy,
    AuthPolicy,
    Class,
    createAuthorizationAnalyzer,
    DefaultFacility,
    findClassRecursive,
    globalPolicies,
    PlumierApplication,
    PublicAuthPolicy,
    ReadonlyAuthPolicy,
    RouteMetadata,
    updateRouteAuthorizationAccess,
    WriteonlyAuthPolicy,
} from "@plumier/core"
import { Context } from "koa"
import KoaJwt from "koa-jwt"
import { isAbsolute, join } from "path"
import { createQueryParserAnalyzer } from "@plumier/query-parser"

/* ------------------------------------------------------------------------------- */
/* ------------------------------- TYPES ----------------------------------------- */
/* ------------------------------------------------------------------------------- */

export type RoleField = string | ((value: any) => Promise<string[]>)

export interface JwtAuthFacilityOption {
    secret?: string,
    globalAuthorize?: string | string[],
    authPolicies?: Class<AuthPolicy> | Class<AuthPolicy>[] | string | string[]
}

async function getPoliciesByFile(root: string, opt: Class<AuthPolicy> | Class<AuthPolicy>[] | string | string[]): Promise<Class[]> {
    if (Array.isArray(opt)) {
        const result = []
        for (const o of opt) {
            result.push(...await getPoliciesByFile(root, o))
        }
        return result
    }
    if (typeof opt === "string") {
        const path = isAbsolute(opt) ? opt : join(root, opt)
        const result = await findClassRecursive(path)
        return getPoliciesByFile(root, result.map(x => x.type))
    }
    else {
        return opt.name.match(/policy$/i) ? [opt] : []
    }
}

// --------------------------------------------------------------------- //
// --------------------------- TOKEN RESOLVER -------------------------- //
// --------------------------------------------------------------------- //

function resolveAuthorizationHeader(ctx: Context, opts: KoaJwt.Options) {
    if (!ctx.header || !ctx.header.authorization)
        return;
    const parts = ctx.header.authorization.trim().split(' ');
    if (parts.length === 2) {
        const scheme = parts[0];
        const credentials: string = parts[1];

        if (/^Bearer$/i.test(scheme)) {
            return credentials;
        }
    }
    throw new Error("Only Bearer authorization scheme supported")
}

function resolveCookies(ctx: Context, opts: KoaJwt.Options) {
    return opts.cookie && ctx.cookies.get(opts.cookie);
}

function getToken(ctx: Context, opts: KoaJwt.Options) {
    return resolveAuthorizationHeader(ctx, opts) ?? resolveCookies(ctx, opts)!
}

/* ------------------------------------------------------------------------------- */
/* --------------------------- MAIN IMPLEMENTATION ------------------------------- */
/* ------------------------------------------------------------------------------- */

export class JwtAuthFacility extends DefaultFacility {
    constructor(private option?: JwtAuthFacilityOption & Partial<KoaJwt.Options>) { super() }

    async preInitialize(app: Readonly<PlumierApplication>) {
        // set auth policies
        const defaultPolicies = [PublicAuthPolicy, AuthenticatedAuthPolicy, ReadonlyAuthPolicy, WriteonlyAuthPolicy]
        const defaultPath = [require.main!.filename, "./**/*policy.+(ts|js)", "./**/*controller.+(ts|js)", "./**/*entity.+(ts|js)"]
        const configPolicies = globalPolicies.concat(await getPoliciesByFile(app.config.rootDir, this.option?.authPolicies ?? defaultPath))
        const authPolicies = [...defaultPolicies, ...configPolicies]
        app.set({ authPolicies })
        // analyze auth policies and throw error
        analyzeAuthPolicyNameConflict(authPolicies)
        // set auth policies analyzers
        const defaultAnalyzers = app.config.analyzers ?? []
        const policies = authPolicies.map(x => new x())
        const authorizeAnalyzer = createAuthorizationAnalyzer(policies, this.option?.globalAuthorize)
        const queryParserAnalyzer = createQueryParserAnalyzer(policies)
        app.set({ analyzers: [...defaultAnalyzers, ...authorizeAnalyzer, ...[queryParserAnalyzer]] })
    }

    async initialize(app: Readonly<PlumierApplication>, routes: RouteMetadata[]) {
        // show authorization applied for route analysis
        updateRouteAuthorizationAccess(routes, app.config)
    }

    setup(app: Readonly<PlumierApplication>) {
        app.set({ enableAuthorization: true })
        // global authorization if not defined then its Authenticated by default
        const globalAuthorizations = !this.option?.globalAuthorize || this.option.globalAuthorize.length === 0 ? [Authenticated] : this.option.globalAuthorize
        app.set({ globalAuthorizations })
        app.set({ openApiSecuritySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } })
        const secret = this.option?.secret ?? process.env.PLUM_JWT_SECRET
        if (!secret) throw new Error("JWT Secret not provided. Provide secret on JwtAuthFacility constructor or environment variable PLUM_JWT_SECRET")
        app.koa.use(KoaJwt({ cookie: "Authorization", getToken, ...this.option, secret, passthrough: true }))
    }
}

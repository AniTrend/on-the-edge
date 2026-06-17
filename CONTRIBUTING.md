# Contributing

When contributing to this repository, please first discuss the change you wish to make via github issue, email, discord or any other method with the owners of this repository before making a change.

Please note we have a code of conduct, please follow it in all your interactions with the project.

## Contributing Guidelines

Please ensure your **issues** adheres to the following guidelines:

- Search previous suggestions for duplicates before making a new one.
- Individual issues for each suggestion, bug or feature.
- Titles should be [sentence case](http://grammar.yourdictionary.com/capitalization/rules-for-capitalization-in-titles.html)

Please ensure your **pull request** adheres to the following guidelines:

- Make an individual pull requests for each issue, and make sure the issue is linked to the PR
- Titles should be based off of the branch name .e.g. `feature/106-add-new-fancy-feature`
- Be sure not to stage any files excluded in any of the `.gitignore` files
- Assure that your commits mention any relevant **issues** or other **pull requests**

## Quality Standards

For any pull requests created exhaustive unit tests are mandatory, showcasing the test cases you've guarded against and the extent of your use case coverage. If you have any questions regarding this please feel free to ask. In addition to these standards please follow the following

- Create branches from issues with the prefix matching the issue type: .e.g `feature/106-name-of-issue-with-feature-description`
- Assign yourself to an issue prior to picking up any work to ensure that multiple people don't start working on the same thing
- Use [discussions](https://github.com/AniTrend/anitrend-on-the-edge/discussions) for general devment related queries or planning information to keep our issues clutter free

Please see [Git Best Practises](https://deepsource.io/blog/git-best-practices/)

## Code of Conduct

### Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or electronic address, without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Our Responsibilities

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, or to ban temporarily or permanently any contributor for other behaviors that they deem inappropriate, threatening, offensive, or harmful.

### Scope

This Code of Conduct applies both within project spaces and in public spaces when an individual is representing the project or its community. Examples of representing a project or community include using an official project e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event. Representation of a project may be further defined and clarified by project maintainers.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at anitrendapp@gmail.com. The project team will review and investigate all complaints, and will respond in a way that it deems appropriate to the circumstances. The project team is obligated to maintain confidentiality with regard to the reporter of an incident. Further details of specific enforcement policies may be posted separately.

Project maintainers who do not follow or enforce the Code of Conduct in good faith may face temporary or permanent repercussions as determined by other members of the project's leadership.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 1.4, available at [http://contributor-covenant.org/version/1/4][version]

[homepage]: http://contributor-covenant.org
[version]: http://contributor-covenant.org/version/1/4/

Thank you for your contribution!

## OpenAPI Contract Guidelines

The generated `swagger-spec.json` is consumed by `edge-graphql` to build the GraphQL gateway that `anitrend-v2` depends on. **Every API change must keep this contract valid.**

### Schema layering

| File | Purpose | Imports `z` from |
|------|---------|-----------------|
| `*.schema.ts` | Runtime validation, preprocessors, coercion | `zod` |
| `*.contract.ts` | Public OpenAPI contract, explicit `.openapi()` | `@scope/common/openapi` |
| `*.swagger.ts` | Re-exports from contract + query wrappers | `@scope/common/openapi` |

### Key rules

- Use `.nullable().optional()` instead of `.nullish()` in contract schemas.
- Replace `z.custom<T>()` with `z.enum([...])` or `z.string()` in contracts.
- Every `@Query()` schema needs an `.openapi()`-wrapped export in `*.swagger.ts`.
- Controllers must import query schemas from `*.swagger.ts`, not `*.schema.ts`.
- Add new schema titles to `EXPECTED_SCHEMA_NAMES` and operation IDs to `EXPECTED_OPERATION_IDS` in `src/common/openapi/names.ts`.

### Running contract validation locally

The contract check requires MongoDB and Redis running locally:

```bash
# Start services (example with Docker)
docker run -d -p 27017:27017 mongo:8
docker run -d -p 6379:6379 redis:8-alpine

# Copy env and run
cp .env.example .env
deno task swagger:generate
deno task swagger:validate
```

CI enforces this via the `contract-check` job. A failing check blocks merge.

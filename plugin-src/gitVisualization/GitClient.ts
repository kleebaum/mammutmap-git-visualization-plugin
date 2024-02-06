import { DefaultLogFields, ListLogLine, LogResult, simpleGit, SimpleGit } from 'simple-git'
import { Message } from '../../dist/pluginFacade'

export type Commit = {
    changedFiles: ChangedFile[]
    message?: string
    hash: string
    author_name: string
    date: string
}

export type ChangedFile = {
    path: string
}

export class GitClient {

    private readonly git: SimpleGit

    public static async new(baseDir: string): Promise<GitClient | Message> {
        const gitClient = new GitClient(baseDir)
        try {
            await gitClient.git.status()
        } catch (error) {
            return new Message('No git repository found.')
        }
        return gitClient
    }

    private constructor(baseDir: string) {
        this.git = simpleGit(baseDir)
    }

    public async getMostRecentCommit(): Promise<Commit> {
        return (await this.getCommits('HEAD^', 'HEAD'))[0]
    }

    public async getCommits(from: string, to: string): Promise<Commit[]> {
        let log: LogResult<DefaultLogFields>
        try {
            log = await this.git.log({ 'from': from, 'to': to })
        } catch (error) {
            log = await this.git.log({ 'from': 'HEAD^', 'to': 'HEAD' })
        }
        const logEntries: readonly (DefaultLogFields & ListLogLine)[] = log.all
        let commits: Commit[] = []
        for (let logEntry of logEntries) {
            const refs: string[] = [`${logEntry.hash}^`, logEntry.hash]
            commits.push({
                ...logEntry,
                changedFiles: await this.getChangedFiles(refs)
            })
        }
        return commits
    }

    public async getChangedFiles(refs: string[]): Promise<ChangedFile[]> {
        if (refs.length === 0) {
            return []
        }
        const diff: string = await this.git.diff(['--name-only', ...refs])
        let changedFiles: ChangedFile[] = []
        diff.split('\n').filter(nonEmptyFilePath => nonEmptyFilePath).map(
            path => changedFiles.push({ path: path }))
        return changedFiles
    }

    public static compareCommitsByDate(commitOne: Commit, commitTwo: Commit) {
        if (commitOne.date < commitTwo.date) return 1
        if (commitOne.date > commitTwo.date) return -1
        return 0
    }
}
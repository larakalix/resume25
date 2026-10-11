import { createPortfolioQueries } from '../../application/content/portfolio-queries';
import { createMockRepositories } from '../../infrastructure/content/mock-repositories';

// Composition root. Replace these adapters with CMS repositories; routes and UI stay unchanged.
export const portfolioQueries = createPortfolioQueries(createMockRepositories());

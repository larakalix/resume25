export default defineEventHandler(async event => {
    const slug = getRouterParam(event, 'slug');
    if (!slug) throw createError({ statusCode: 400, statusMessage: 'An article slug is required' });
    const content = await portfolioQueries.getArticle(slug);
    if (!content) throw createError({ statusCode: 404, statusMessage: 'Article not found' });
    return content;
});

import logToConsole from 'eleventy-plugin-console-plus'
import tailwindcss from 'eleventy-plugin-tailwindcss-4'
import slugify from "slugify";
import { chunk } from "lodash-es";

export default (eleventyConfig) => {
  // Add TailwindCSS plugin
  eleventyConfig.addPlugin(tailwindcss, {
    input: 'css/tailwind.css'
  });

  // Add console plus plugin
  eleventyConfig.addPlugin(logToConsole, { depth: 2 });

  // Collection to easily access all posts
  eleventyConfig.addCollection("posts", (collectionAPI) => {
    return collectionAPI.getFilteredByGlob("./src/posts/**/*.md");
  })

  // A collection of the posts by each category with pagination.
  eleventyConfig.addCollection("postsByCategories", (collectionAPI) => {
    let numberOfresultsPerPage = 2; // number of results per page
    let slugPrefix = "/posts"; // Optional: the prefix for the slug could be /articles or /blog etc

    // some variables to help with creating our data strucutre
    let postsByCategories = [];
    let pageDataForAllCategories = [];
    let categoryData = {};

    // Create a collection of posts.
    const posts = collectionAPI.getFilteredByGlob("./src/posts/**/*.md");

    // Create a Set to store unique categories.
    let uniqueCategories = new Set()

    // Loop through each post and add its category to the Set.
    posts.forEach(post => {
      post.data?.category ? uniqueCategories.add(post.data.category) : null
    })

    // we now have a set of uniquie categories
    // console.log(`There are ${posts.length} posts in ${uniqueCategories.size} unique categories`)
    // console.log(uniqueCategories)


    // Loop through each unique category 
    uniqueCategories.forEach((categoryName) => {
      let allPostinCurrentCategory = [];

      // loop through all the posts.
      // If the current post category matches the current category
      // then add it to the allPostinCurrentCategory array.
      posts.forEach((post) => {
        if (post.data.category == categoryName) {
          allPostinCurrentCategory.push(post);
        }
      });

      // chunk up all the posts in this category by the number of results/page we want.
      // We need to do this so we can create pagination.
      // chunk() is from lodash-es imported above
      let chunks = chunk(allPostinCurrentCategory, numberOfresultsPerPage);

      // create the slug for this category
      let slug = `${slugPrefix}/${slugify(categoryName, { lower: true })}/`

      // create an array of pageSlugs for this category
      let pageSlugs = [];
      for (let i = 0; i < chunks.length; i++) {
        let thisSlug = slug;
        // If there is more than one page of results.
        if (i > 0) {
          thisSlug = `${i + 1}`;

          // check to see if the slug has a prefix
          // don't want to add an addianal / if its not needed.
          if (slug != "") {
            thisSlug = `${slug}${i + 1}/`;
          }
        }
        pageSlugs.push(`${thisSlug}`);
      }

      // create a data structure to hold the category data
      // makes the UI eaier to create.
      categoryData[categoryName] = {
        name: categoryName,
        slug: slug,
        numberOfPosts: allPostinCurrentCategory.length,
      };

      // console.log(`[ categoryData ]:`, categoryData);

      // create a data structure to hold all the posts
      pageDataForAllCategories.push({
        categoryName: categoryName,
        posts: allPostinCurrentCategory,
        categoryData: categoryData,
        chunkedPosts: chunks,
        numberOfPosts: allPostinCurrentCategory.length,
        numberOfPagesOfPosts: chunks.length,
        pageSlugs: pageSlugs,
      });
    });


    //  console.log(`[ pageDataForAllCategories ]:`, pageDataForAllCategories);

    // Create a single flattened aray of all the posts and pagination data.
    // This allows us to use pagination in our templates.
    pageDataForAllCategories.forEach((category) => {
      let thisCategoriesPageSlugs = category.pageSlugs;

      // loop each of the chunked posts
      category.chunkedPosts.forEach((posts, index) => {
        // set some properties useful in the UI
        let isFirstPage = index == 0 ? true : false;
        let isLastPage = category.numberOfPagesOfPosts == index + 1 ? true : false;

        // contruct the pagination object and add to blogPostsByCategories Arrau
        postsByCategories.push({
          categoryName: category.categoryName,

          // contructs the pageslugs needed for pagination controls.
          pageSlugs: {
            all: thisCategoriesPageSlugs,
            next: thisCategoriesPageSlugs[index + 1] || null,
            previous: thisCategoriesPageSlugs[index - 1] || null,
            first: thisCategoriesPageSlugs[0] || null,
            last:
              thisCategoriesPageSlugs[thisCategoriesPageSlugs.length - 1] ||
              null,
            count: thisCategoriesPageSlugs.length,
          },
          slug: thisCategoriesPageSlugs[index],
          totalPages: category.numberOfPagesOfPosts, // total number of pages of posts
          numberOfPosts: category.numberOfPosts, // total number of posts in this category
          isFirstPage: isFirstPage, // true if this is first chunk/page of results.
          isLastPage: isLastPage, // true if this is last chunk/page of results.
          currentPage: index + 1, // the current page (useful for UI)
          posts: posts, // the posts in this chunk
          categoryData,
        });
      });
    });
    return postsByCategories;
  })
}

export const config = {
  htmlTemplateEngine: "njk",
  markdownTemplateEngine: "njk",
  dir: {
    input: "src",
    output: "dist",
    includes: '_partials/',
    layouts: '_partials/_layouts',
    data: '_data'
  },
};